use notify::{RecommendedWatcher, RecursiveMode, Watcher, Config};
use std::sync::mpsc::channel;
use crate::prompts::{update_prompt_from_file, recreate_prompt_file};
use crate::error::{AppError, Result};
use tauri::Manager;
use tauri::Emitter;

pub fn start_file_watcher(app_handle: tauri::AppHandle) -> Result<()> {
    let (tx, rx) = channel();
    
    let mut watcher = RecommendedWatcher::new(tx, Config::default())?;
    
    let prompts_dir = app_handle.path().document_dir()
        .map_err(|e| AppError::Path(e.to_string()))?
        .join("PromptMaster");
    
    // Ensure the directory exists before watching
    std::fs::create_dir_all(&prompts_dir)?;
    
    watcher.watch(&prompts_dir, RecursiveMode::Recursive)?;
    
    // Store watcher to prevent it from being dropped
    let app_handle_clone = app_handle.clone();
    std::thread::spawn(move || {
        // Keep watcher alive in this thread
        let _watcher = watcher;
        
        for res in rx {
            match res {
                Ok(event) => {
                    log::debug!("File changed: {:?}", event);
                    
                    // Emit event to frontend
                    #[derive(serde::Serialize, Clone)]
                    struct FileChangeEvent {
                        kind: String,
                        paths: Vec<String>,
                    }

                    let event_kind = format!("{:?}", event.kind);
                    
                    // Process write/create events for markdown files
                    if event_kind.contains("Write") || event_kind.contains("Create") {
                        // Filter to only process .md files and ignore database/temp files
                        let md_files: Vec<_> = event.paths.iter()
                            .filter(|path| {
                                // Only process .md files
                                path.extension().map_or(false, |ext| ext == "md") &&
                                // Ignore hidden/temporary files
                                !path.file_name()
                                    .map_or(true, |name| name.to_string_lossy().starts_with('.')) &&
                                // Ignore backup files
                                !path.file_name()
                                    .map_or(true, |name| name.to_string_lossy().ends_with('~'))
                            })
                            .collect();
                        
                        if !md_files.is_empty() {
                            log::info!("Processing {} markdown file changes", md_files.len());
                            
                            // Emit event to frontend only for relevant changes
                            let paths: Vec<String> = md_files.iter()
                                .map(|p| p.to_string_lossy().into_owned())
                                .collect();
                            
                            let payload = FileChangeEvent {
                                kind: event_kind.clone(),
                                paths: paths.clone(),
                            };

                            if let Err(e) = app_handle_clone.emit("file-changed", payload) {
                                log::error!("Failed to emit file-changed event: {}", e);
                            }
                            
                            // Add a small delay to ensure file write is complete
                            std::thread::sleep(std::time::Duration::from_millis(100));
                            
                            for path in md_files {
                                match update_prompt_from_file(&app_handle_clone, path) {
                                    Ok(()) => {
                                        log::info!("Successfully updated prompt from file: {:?}", path);
                                    }
                                    Err(e) => {
                                        log::warn!("Failed to re-index file {:?}: {}", path, e);
                                    }
                                }
                            }
                        } else {
                            log::debug!("Ignoring non-markdown file changes: {:?}", event.paths);
                        }
                    }
                    // Handle delete events for markdown files
                    else if event_kind.contains("Remove") {
                        let md_files: Vec<_> = event.paths.iter()
                            .filter(|path| {
                                // Only process .md files
                                path.extension().map_or(false, |ext| ext == "md") &&
                                // Ignore hidden/temporary files
                                !path.file_name()
                                    .map_or(true, |name| name.to_string_lossy().starts_with('.')) &&
                                // Ignore backup files
                                !path.file_name()
                                    .map_or(true, |name| name.to_string_lossy().ends_with('~'))
                            })
                            .collect();
                        
                        if !md_files.is_empty() {
                            log::info!("Processing {} markdown file deletions", md_files.len());
                            
                            // Emit event to frontend for file deletions
                            let paths: Vec<String> = md_files.iter()
                                .map(|p| p.to_string_lossy().into_owned())
                                .collect();
                            
                            let payload = FileChangeEvent {
                                kind: "FileDeleted".to_string(),
                                paths: paths.clone(),
                            };

                            if let Err(e) = app_handle_clone.emit("file-deleted", payload) {
                                log::error!("Failed to emit file-deleted event: {}", e);
                            }
                            
                            // Recreate deleted files from database
                            for path in md_files {
                                match recreate_prompt_file(&app_handle_clone, path) {
                                    Ok(recreated) => {
                                        if recreated {
                                            log::info!("Successfully recreated prompt file: {:?}", path);
                                        } else {
                                            log::warn!("Deleted file not found in database: {:?}", path);
                                        }
                                    }
                                    Err(e) => {
                                        log::error!("Failed to recreate file {:?}: {}", path, e);
                                    }
                                }
                            }
                        } else {
                            log::debug!("Ignoring non-markdown file deletions: {:?}", event.paths);
                        }
                    }
                }
                Err(e) => {
                    log::error!("File watcher error: {}", e);
                }
            }
        }
        
        log::info!("File watcher thread shutting down");
    });
    
    Ok(())
}
