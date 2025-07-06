use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::Utc;
use rusqlite::params;
use crate::db::get_database;
use crate::error::{AppError, Result};
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

fn validate_prompt_input(title: &str, content: &str, tags: &[String]) -> Result<()> {
    if title.trim().is_empty() {
        return Err(AppError::InvalidInput("Title cannot be empty".to_string()));
    }
    if title.len() > 255 {
        return Err(AppError::InvalidInput("Title too long (max 255 characters)".to_string()));
    }
    if content.trim().is_empty() {
        return Err(AppError::InvalidInput("Content cannot be empty".to_string()));
    }
    if content.len() > 100_000 {
        return Err(AppError::InvalidInput("Content too long (max 100,000 characters)".to_string()));
    }
    if tags.len() > 20 {
        return Err(AppError::InvalidInput("Too many tags (max 20)".to_string()));
    }
    for tag in tags {
        if tag.trim().is_empty() {
            return Err(AppError::InvalidInput("Tag cannot be empty".to_string()));
        }
        if tag.len() > 50 {
            return Err(AppError::InvalidInput("Tag too long (max 50 characters)".to_string()));
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn save_prompt(
    title: String,
    content: String,
    tags: Vec<String>,
    app_handle: tauri::AppHandle,
) -> std::result::Result<Prompt, String> {
    log::info!("Saving prompt: {}", title);
    
    // Validate input
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

        // Insert new version if content changed
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

        Ok(())
    })?;

    Ok(())
}
