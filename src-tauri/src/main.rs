#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod error;
mod database;
mod db;
mod prompts;
mod versions;
mod watcher;

use db::init_database;
use prompts::{save_prompt, list_prompts};
use versions::{get_latest_version, save_new_version, list_versions, get_version_by_uuid};
use watcher::start_file_watcher;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize logger
    env_logger::Builder::from_default_env()
        .filter_level(log::LevelFilter::Info)
        .init();

    log::info!("Starting PromptMaster Lite...");

    tauri::Builder::default()
        .setup(|app| {
            init_database(&app.handle()).map_err(|e| {
                log::error!("Database initialization failed: {}", e);
                format!("Database initialization failed: {}", e)
            })?;
            
            start_file_watcher(app.handle().clone()).map_err(|e| {
                log::error!("File watcher failed: {}", e);
                format!("File watcher failed: {}", e)
            })?;
            
            log::info!("Application initialized successfully");
            Ok(())
        })
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            save_prompt, 
            list_prompts, 
            get_latest_version, 
            save_new_version, 
            list_versions, 
            get_version_by_uuid
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn main() {
    run();
}