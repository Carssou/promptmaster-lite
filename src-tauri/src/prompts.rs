use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::Utc;
use rusqlite::params;
use crate::db::get_database;
use crate::error::{AppError, Result};
use crate::security::validate_prompt_input;
use tauri::Manager;
use regex::Regex;
use lazy_static::lazy_static;
use std::fs;
use std::path::Path;

#[derive(Debug, Serialize, Deserialize)]
pub struct Prompt {
    pub uuid: String,
    pub title: String,
    pub tags: Vec<String>,
    pub created_at: String,
    pub updated_at: String,
}

// Input validation moved to security.rs module

#[tauri::command]
pub async fn save_prompt(
    title: String,
    content: String,
    tags: Vec<String>,
    app_handle: tauri::AppHandle,
) -> std::result::Result<Prompt, String> {
    log::info!("Saving prompt: {} (content: {} chars)", title, content.len());
    
    // Validate input with security checks
    validate_prompt_input(&title, &content, &tags)?;
    
    let prompt_uuid = Uuid::now_v7().to_string();
    let version_uuid = Uuid::now_v7().to_string();
    let now = Utc::now().to_rfc3339();
    
    // Get database connection
    let db = get_database()?;
    
    // Use transaction for atomicity
    db.with_transaction(|tx| {
        // Insert prompt record
        let tags_json = serde_json::to_string(&tags)
            .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?;
        tx.execute(
            "INSERT INTO prompts (uuid, title, tags, created_at, updated_at) 
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![
                &prompt_uuid, 
                &title, 
                &tags_json, 
                &now, 
                &now
            ],
        )?;
        
        // Insert version
        tx.execute(
            "INSERT INTO versions (uuid, prompt_uuid, semver, body, created_at) 
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![
                &version_uuid, 
                &prompt_uuid, 
                "1.0.0", 
                &content, 
                &now
            ],
        )?;
        
        Ok(())
    })?;
    
    // Save to file (after successful database transaction)
    save_prompt_file(&app_handle, &title, &content, &tags, &prompt_uuid)?;
    
    log::info!("Successfully saved prompt: {} ({})", title, prompt_uuid);
    
    Ok(Prompt {
        uuid: prompt_uuid,
        title,
        tags,
        created_at: now.clone(),
        updated_at: now,
    })
}

fn save_prompt_file(
    app_handle: &tauri::AppHandle,
    title: &str,
    content: &str,
    tags: &[String],
    uuid: &str,
) -> Result<()> {
    let documents_dir = app_handle
        .path()
        .document_dir()
        .map_err(|e| AppError::Path(e.to_string()))?;
    
    let prompts_dir = documents_dir.join("PromptMaster");
    std::fs::create_dir_all(&prompts_dir)?;
    
    let date = Utc::now().format("%Y-%m-%d").to_string();
    // Sanitize title for filename
    let slug = title
        .chars()
        .filter_map(|c| {
            if c.is_alphanumeric() || c == ' ' || c == '-' || c == '_' {
                Some(c.to_ascii_lowercase())
            } else {
                None
            }
        })
        .collect::<String>()
        .replace(' ', "-");
    
    let filename = format!("{}--{}--v1.0.0.md", date, slug);
    
    let frontmatter = format!(
        r#"---
uuid: "{}"
version: "1.0.0"
title: "{}"
tags: {:?}
created: {}
modified: {}
---

{}"#,
        uuid,
        title,
        tags,
        Utc::now().format("%Y-%m-%d"),
        Utc::now().format("%Y-%m-%d"),
        content
    );
    
    std::fs::write(prompts_dir.join(filename), frontmatter)?;
    
    Ok(())
}

#[tauri::command]
pub async fn list_prompts(_app_handle: tauri::AppHandle) -> std::result::Result<Vec<Prompt>, String> {
    let db = get_database()?;
    
    let prompts = db.with_connection(|conn| {
        let mut stmt = conn.prepare(
            "SELECT uuid, title, tags, created_at, updated_at FROM prompts 
             ORDER BY updated_at DESC"
        )?;
        
        let prompt_iter = stmt.query_map([], |row| {
            let tags_str: String = row.get(2)?;
            let tags: Vec<String> = serde_json::from_str(&tags_str)
                .unwrap_or_else(|_| Vec::new());
            
            Ok(Prompt {
                uuid: row.get(0)?,
                title: row.get(1)?,
                tags,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        })?;
        
        let mut prompts = Vec::new();
        for prompt in prompt_iter {
            prompts.push(prompt?);
        }
        
        Ok(prompts)
    })?;
    
    Ok(prompts)
}

pub fn update_prompt_from_file(
    _app_handle: &tauri::AppHandle,
    file_path: &Path,
) -> Result<()> {
    // Skip non-markdown files
    if !file_path.extension().map_or(false, |ext| ext == "md") {
        return Ok(());
    }
    
    let content = fs::read_to_string(file_path)?;

    lazy_static! {
        static ref FRONTMATTER_REGEX: Regex = Regex::new(r"^---\n([\s\S]*?)\n---\n([\s\S]*)").unwrap();
        static ref UUID_REGEX: Regex = Regex::new(r#"uuid: "([^"]+)""#).unwrap();
        static ref TITLE_REGEX: Regex = Regex::new(r#"title: "([^"]+)""#).unwrap();
        static ref TAGS_REGEX: Regex = Regex::new(r#"tags: \[([^\]]*)\]"#).unwrap();
        static ref VERSION_REGEX: Regex = Regex::new(r#"version: "([^"]+)""#).unwrap();
    }

    let captures = FRONTMATTER_REGEX.captures(&content)
        .ok_or_else(|| AppError::InvalidInput("No frontmatter found".to_string()))?;

    let frontmatter_str = captures.get(1).map_or("", |m| m.as_str());
    let body = captures.get(2).map_or("", |m| m.as_str()).trim();

    let uuid = UUID_REGEX.captures(frontmatter_str)
        .and_then(|c| c.get(1).map(|m| m.as_str().to_string()))
        .ok_or_else(|| AppError::InvalidInput("UUID not found in frontmatter".to_string()))?;
    
    let title = TITLE_REGEX.captures(frontmatter_str)
        .and_then(|c| c.get(1).map(|m| m.as_str().to_string()))
        .ok_or_else(|| AppError::InvalidInput("Title not found in frontmatter".to_string()))?;

    let tags_str = TAGS_REGEX.captures(frontmatter_str)
        .and_then(|c| c.get(1).map(|m| m.as_str().to_string()))
        .unwrap_or_default();
    
    // Parse tags more robustly
    let tags: Vec<String> = if tags_str.trim().is_empty() {
        Vec::new()
    } else {
        tags_str
            .split(',')
            .filter_map(|s| {
                let trimmed = s.trim().trim_matches('"');
                if trimmed.is_empty() {
                    None
                } else {
                    Some(trimmed.to_string())
                }
            })
            .collect()
    };

    let version = VERSION_REGEX.captures(frontmatter_str)
        .and_then(|c| c.get(1).map(|m| m.as_str().to_string()))
        .unwrap_or_else(|| "1.0.0".to_string());

    // Validate parsed data
    validate_prompt_input(&title, body, &tags)?;

    let now = Utc::now().to_rfc3339();
    let db = get_database()?;

    db.with_transaction(|tx| {
        // Update prompt record
        let tags_json = serde_json::to_string(&tags)
            .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?;
        tx.execute(
            "UPDATE prompts SET title = ?1, tags = ?2, updated_at = ?3 WHERE uuid = ?4",
            params![
                &title,
                &tags_json,
                &now,
                &uuid
            ],
        )?;

        // Insert new version only if it doesn't already exist (avoid file watcher duplicates)
        let version_exists = {
            let mut stmt = tx.prepare("SELECT COUNT(*) FROM versions WHERE prompt_uuid = ?1 AND semver = ?2")?;
            let count: i64 = stmt.query_row([&uuid, &version], |row| Ok(row.get(0)?))?;
            count > 0
        };
        
        if !version_exists {
            let version_uuid = Uuid::now_v7().to_string();
            tx.execute(
                "INSERT INTO versions (uuid, prompt_uuid, semver, body, created_at) 
                 VALUES (?1, ?2, ?3, ?4, ?5)",
                params![
                    &version_uuid,
                    &uuid,
                    &version,
                    &body,
                    &now
                ],
            )?;
            log::info!("File watcher created new version {} for prompt {}", version, uuid);
        } else {
            log::debug!("Version {} already exists for prompt {}, skipping duplicate creation", version, uuid);
        }

        Ok(())
    })?;

    Ok(())
}

pub fn recreate_prompt_file(
    app_handle: &tauri::AppHandle,
    deleted_file_path: &Path,
) -> Result<bool> {
    // Extract UUID from filename using regex
    let filename = deleted_file_path
        .file_name()
        .ok_or_else(|| AppError::InvalidInput("Invalid file path".to_string()))?
        .to_string_lossy();
    
    // Parse the filename to extract UUID from frontmatter
    // First check if the file exists in the database by trying to match the filename pattern
    lazy_static! {
        static ref FILENAME_REGEX: Regex = Regex::new(r"(\d{4}-\d{2}-\d{2})--(.+)--v(\d+\.\d+\.\d+)\.md").unwrap();
    }
    
    let captures = FILENAME_REGEX.captures(&filename);
    if captures.is_none() {
        log::warn!("Deleted file doesn't match expected pattern: {}", filename);
        return Ok(false);
    }
    
    let captures = captures.unwrap();
    let _date = captures.get(1).map(|m| m.as_str());
    let title_slug = captures.get(2).map(|m| m.as_str()).unwrap_or("");
    let version = captures.get(3).map(|m| m.as_str()).unwrap_or("1.0.0");
    
    // Find the prompt by searching for matching title slug in database
    let db = get_database()?;
    let prompt_data = db.with_connection(|conn| {
        // First, try to find the prompt by matching the title slug
        let mut stmt = conn.prepare(
            "SELECT p.uuid, p.title, p.tags, v.body, v.created_at 
             FROM prompts p 
             JOIN versions v ON p.uuid = v.prompt_uuid 
             WHERE v.semver = ?1 
             ORDER BY v.created_at DESC 
             LIMIT 1"
        )?;
        
        let result = stmt.query_row([version], |row| {
            let uuid: String = row.get(0)?;
            let title: String = row.get(1)?;
            let tags_str: String = row.get(2)?;
            let body: String = row.get(3)?;
            let created_at: String = row.get(4)?;
            
            // Parse tags
            let tags: Vec<String> = serde_json::from_str(&tags_str)
                .unwrap_or_else(|_| Vec::new());
            
            // Check if this prompt matches the deleted file's title slug
            let computed_slug = title
                .chars()
                .filter_map(|c| {
                    if c.is_alphanumeric() || c == ' ' || c == '-' || c == '_' {
                        Some(c.to_ascii_lowercase())
                    } else {
                        None
                    }
                })
                .collect::<String>()
                .replace(' ', "-");
            
            if computed_slug == title_slug {
                Ok(Some((uuid, title, tags, body, created_at)))
            } else {
                Ok(None)
            }
        });
        
        match result {
            Ok(Some(data)) => Ok(data),
            Ok(None) => {
                // If no match found, try to find by searching all prompts
                let mut stmt = conn.prepare(
                    "SELECT p.uuid, p.title, p.tags, v.body, v.created_at 
                     FROM prompts p 
                     JOIN versions v ON p.uuid = v.prompt_uuid 
                     WHERE v.semver = ?1"
                )?;
                
                let rows = stmt.query_map([version], |row| {
                    let uuid: String = row.get(0)?;
                    let title: String = row.get(1)?;
                    let tags_str: String = row.get(2)?;
                    let body: String = row.get(3)?;
                    let created_at: String = row.get(4)?;
                    
                    let tags: Vec<String> = serde_json::from_str(&tags_str)
                        .unwrap_or_else(|_| Vec::new());
                    
                    Ok((uuid, title, tags, body, created_at))
                })?;
                
                // Find the first match by title slug
                for row in rows {
                    let (uuid, title, tags, body, created_at) = row?;
                    let computed_slug = title
                        .chars()
                        .filter_map(|c| {
                            if c.is_alphanumeric() || c == ' ' || c == '-' || c == '_' {
                                Some(c.to_ascii_lowercase())
                            } else {
                                None
                            }
                        })
                        .collect::<String>()
                        .replace(' ', "-");
                    
                    if computed_slug == title_slug {
                        return Ok((uuid, title, tags, body, created_at));
                    }
                }
                
                Err(rusqlite::Error::QueryReturnedNoRows)
            }
            Err(e) => Err(e),
        }
    });
    
    match prompt_data {
        Ok(data) => {
            let (uuid, title, tags, body, created_at) = data;
            
            // Recreate the file
            let documents_dir = app_handle
                .path()
                .document_dir()
                .map_err(|e| AppError::Path(e.to_string()))?;
            
            let prompts_dir = documents_dir.join("PromptMaster");
            std::fs::create_dir_all(&prompts_dir)?;
            
            // Parse the created_at date for filename
            let date = if let Ok(datetime) = chrono::DateTime::parse_from_rfc3339(&created_at) {
                datetime.format("%Y-%m-%d").to_string()
            } else {
                Utc::now().format("%Y-%m-%d").to_string()
            };
            
            let slug = title
                .chars()
                .filter_map(|c| {
                    if c.is_alphanumeric() || c == ' ' || c == '-' || c == '_' {
                        Some(c.to_ascii_lowercase())
                    } else {
                        None
                    }
                })
                .collect::<String>()
                .replace(' ', "-");
            
            let filename = format!("{}--{}--v{}.md", date, slug, version);
            let file_path = prompts_dir.join(&filename);
            
            // Create the frontmatter content
            let frontmatter = format!(
                r#"---
uuid: "{}"
version: "{}"
title: "{}"
tags: {:?}
created: {}
modified: {}
---

{}"#,
                uuid,
                version,
                title,
                tags,
                date,
                Utc::now().format("%Y-%m-%d"),
                body
            );
            
            std::fs::write(&file_path, frontmatter)?;
            
            log::info!("Successfully recreated file: {} -> {}", filename, file_path.display());
            Ok(true)
        }
        Err(AppError::Database(rusqlite::Error::QueryReturnedNoRows)) => {
            log::warn!("No database entry found for deleted file: {}", filename);
            Ok(false)
        }
        Err(e) => {
            log::error!("Error while recreating file: {}", e);
            Err(e)
        }
    }
}
