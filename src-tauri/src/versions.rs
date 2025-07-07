use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::Utc;
use rusqlite::params;
use crate::db::get_database;
use crate::error::{AppError, Result};
use regex::Regex;
use lazy_static::lazy_static;
use tauri::Manager;
use std::fs;

#[derive(Debug, Serialize, Deserialize)]
pub struct Version {
    pub uuid: String,
    pub prompt_uuid: String,
    pub semver: String,
    pub body: String,
    pub metadata: Option<String>,
    pub created_at: String,
    pub parent_uuid: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VersionInfo {
    pub uuid: String,
    pub semver: String,
    pub created_at: String,
    pub parent_uuid: Option<String>,
}

// Semantic version parsing and bumping utilities
fn parse_semver(version: &str) -> Result<(u32, u32, u32)> {
    lazy_static! {
        static ref SEMVER_REGEX: Regex = Regex::new(r"^(\d+)\.(\d+)\.(\d+)$").unwrap();
    }
    
    let captures = SEMVER_REGEX.captures(version)
        .ok_or_else(|| AppError::InvalidInput(format!("Invalid semantic version: {}", version)))?;
    
    let major: u32 = captures.get(1).unwrap().as_str().parse()
        .map_err(|_| AppError::InvalidInput("Invalid major version number".to_string()))?;
    let minor: u32 = captures.get(2).unwrap().as_str().parse()
        .map_err(|_| AppError::InvalidInput("Invalid minor version number".to_string()))?;
    let patch: u32 = captures.get(3).unwrap().as_str().parse()
        .map_err(|_| AppError::InvalidInput("Invalid patch version number".to_string()))?;
    
    Ok((major, minor, patch))
}

fn bump_patch_version(version: &str) -> Result<String> {
    let (major, minor, patch) = parse_semver(version)?;
    Ok(format!("{}.{}.{}", major, minor, patch + 1))
}

/// Check for version conflicts (same content)
fn detect_version_conflict(
    tx: &rusqlite::Transaction,
    prompt_uuid: &str,
    new_body: &str,
) -> Result<Option<String>> {
    let mut stmt = tx.prepare(
        "SELECT semver FROM versions 
         WHERE prompt_uuid = ?1 AND body = ?2 
         LIMIT 1"
    )?;
    
    let mut rows = stmt.query_map([prompt_uuid, new_body], |row| {
        Ok(row.get::<_, String>(0)?)
    })?;
    
    match rows.next() {
        Some(row) => Ok(Some(row?)),
        None => Ok(None),
    }
}

/// Create or update markdown file for a version
fn sync_version_to_file(
    app_handle: &tauri::AppHandle,
    prompt_uuid: &str,
    title: &str,
    body: &str,
    semver: &str,
    tags: &[String],
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
    
    let filename = format!("{}--{}--v{}.md", date, slug, semver);
    let file_path = prompts_dir.join(&filename);
    
    // Check if file already exists and has same content to avoid unnecessary writes
    if file_path.exists() {
        if let Ok(existing_content) = fs::read_to_string(&file_path) {
            let new_content = create_markdown_content(prompt_uuid, title, body, semver, tags);
            if existing_content == new_content {
                log::debug!("Skipping file write - content unchanged: {}", filename);
                return Ok(());
            }
        }
    }
    
    let frontmatter = create_markdown_content(prompt_uuid, title, body, semver, tags);
    fs::write(&file_path, frontmatter)?;
    
    log::info!("Synced version {} to file: {}", semver, filename);
    Ok(())
}

/// Create markdown content with frontmatter
fn create_markdown_content(
    uuid: &str,
    title: &str, 
    body: &str,
    semver: &str,
    tags: &[String],
) -> String {
    let now = Utc::now().format("%Y-%m-%d").to_string();
    
    format!(
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
        semver,
        title,
        tags,
        now,
        now,
        body
    )
}

/// Get the latest version body for a prompt
#[tauri::command]
pub async fn get_latest_version(prompt_uuid: String) -> std::result::Result<Option<String>, String> {
    log::info!("Getting latest version for prompt: {}", prompt_uuid);
    
    if prompt_uuid.trim().is_empty() {
        return Err("Prompt UUID cannot be empty".to_string());
    }
    
    let db = get_database()?;
    
    let result = db.with_connection(|conn| {
        // Get the latest version by created_at (most recent)
        let mut stmt = conn.prepare(
            "SELECT body FROM versions 
             WHERE prompt_uuid = ?1 
             ORDER BY created_at DESC
             LIMIT 1"
        )?;
        
        let mut rows = stmt.query_map([&prompt_uuid], |row| {
            Ok(row.get::<_, String>(0)?)
        })?;
        
        match rows.next() {
            Some(row) => Ok(Some(row?)),
            None => Ok(None),
        }
    })?;
    
    if result.is_some() {
        log::info!("Retrieved latest version for prompt {}: {} characters", prompt_uuid, result.as_ref().unwrap().len());
    } else {
        log::warn!("No versions found for prompt {}", prompt_uuid);
    }
    
    Ok(result)
}

/// Save a new version with automatic patch bump
#[tauri::command]
pub async fn save_new_version(
    prompt_uuid: String,
    body: String,
    app_handle: tauri::AppHandle,
) -> std::result::Result<Version, String> {
    log::info!("Saving new version for prompt: {}", prompt_uuid);
    
    // Validate input
    if prompt_uuid.trim().is_empty() {
        return Err("Prompt UUID cannot be empty".to_string());
    }
    if body.trim().is_empty() {
        return Err("Version body cannot be empty".to_string());
    }
    if body.len() > 100_000 {
        return Err("Version body too long (max 100,000 characters)".to_string());
    }
    
    let db = get_database()?;
    let version_uuid = Uuid::now_v7().to_string();
    let now = Utc::now().to_rfc3339();
    
    let result = db.with_transaction(|tx| {
        // Get prompt details (title, tags) and verify it exists
        let (prompt_title, prompt_tags): (String, String) = {
            let mut stmt = tx.prepare("SELECT title, tags FROM prompts WHERE uuid = ?1")?;
            let mut rows = stmt.query_map([&prompt_uuid], |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
            })?;
            
            match rows.next() {
                Some(row) => row?,
                None => return Err(rusqlite::Error::InvalidColumnName(
                    format!("Prompt with UUID {} does not exist", prompt_uuid)
                )),
            }
        };
        
        // Check for version conflicts (same content already exists)
        if let Some(existing_version) = detect_version_conflict(tx, &prompt_uuid, &body)
            .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))? {
            return Err(rusqlite::Error::InvalidColumnName(
                format!("Content already exists in version {}", existing_version)
            ));
        }
        
        // Get the latest version to determine next semver
        let latest_version = {
            let mut stmt = tx.prepare(
                "SELECT semver, uuid FROM versions 
                 WHERE prompt_uuid = ?1 
                 ORDER BY created_at DESC
                 LIMIT 1"
            )?;
            
            let mut rows = stmt.query_map([&prompt_uuid], |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
            })?;
            
            rows.next().transpose()?
        };
        
        let (new_semver, parent_uuid) = match latest_version {
            Some((latest_semver, latest_uuid)) => {
                let new_semver = bump_patch_version(&latest_semver)
                    .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?;
                (new_semver, Some(latest_uuid))
            }
            None => {
                // First version
                ("1.0.0".to_string(), None)
            }
        };
        
        // Insert new version
        tx.execute(
            "INSERT INTO versions (uuid, prompt_uuid, semver, body, created_at, parent_uuid) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                &version_uuid,
                &prompt_uuid,
                &new_semver,
                &body,
                &now,
                &parent_uuid
            ],
        )?;
        
        // Update prompt's updated_at timestamp
        tx.execute(
            "UPDATE prompts SET updated_at = ?1 WHERE uuid = ?2",
            params![&now, &prompt_uuid],
        )?;
        
        Ok((Version {
            uuid: version_uuid.clone(),
            prompt_uuid: prompt_uuid.clone(),
            semver: new_semver.clone(),
            body: body.clone(),
            metadata: None,
            created_at: now,
            parent_uuid,
        }, prompt_title, prompt_tags, new_semver))
    })?;
    
    // Sync to file system after successful database transaction
    let tags: Vec<String> = serde_json::from_str(&result.1)
        .unwrap_or_else(|_| Vec::new());
    
    if let Err(e) = sync_version_to_file(&app_handle, &prompt_uuid, &result.1, &result.0.body, &result.3, &tags) {
        log::warn!("Failed to sync version to file: {}", e);
        // Continue - don't fail the whole operation for file sync issues
    }
    
    log::info!("Successfully saved new version {} for prompt {}", 
               result.0.semver, prompt_uuid);
    
    Ok(result.0)
}

/// List all versions for a prompt, ordered by semver descending
#[tauri::command]
pub async fn list_versions(prompt_uuid: String) -> std::result::Result<Vec<VersionInfo>, String> {
    log::info!("Listing versions for prompt: {}", prompt_uuid);
    
    if prompt_uuid.trim().is_empty() {
        return Err("Prompt UUID cannot be empty".to_string());
    }
    
    let db = get_database()?;
    
    let versions = db.with_connection(|conn| {
        let mut stmt = conn.prepare(
            "SELECT uuid, semver, created_at, parent_uuid FROM versions 
             WHERE prompt_uuid = ?1 
             ORDER BY created_at DESC"
        )?;
        
        let version_iter = stmt.query_map([&prompt_uuid], |row| {
            Ok(VersionInfo {
                uuid: row.get(0)?,
                semver: row.get(1)?,
                created_at: row.get(2)?,
                parent_uuid: row.get(3)?,
            })
        })?;
        
        let mut versions = Vec::new();
        for version in version_iter {
            versions.push(version?);
        }
        
        Ok(versions)
    })?;
    
    log::info!("Found {} versions for prompt {}", versions.len(), prompt_uuid);
    if versions.is_empty() {
        log::warn!("No versions found in database for prompt {}", prompt_uuid);
    }
    
    Ok(versions)
}

/// Get a specific version by UUID
#[tauri::command]
pub async fn get_version_by_uuid(version_uuid: String) -> std::result::Result<Option<Version>, String> {
    log::info!("Getting version by UUID: {}", version_uuid);
    
    if version_uuid.trim().is_empty() {
        return Err("Version UUID cannot be empty".to_string());
    }
    
    let db = get_database()?;
    
    let result = db.with_connection(|conn| {
        let mut stmt = conn.prepare(
            "SELECT uuid, prompt_uuid, semver, body, metadata, created_at, parent_uuid 
             FROM versions WHERE uuid = ?1"
        )?;
        
        let mut rows = stmt.query_map([&version_uuid], |row| {
            Ok(Version {
                uuid: row.get(0)?,
                prompt_uuid: row.get(1)?,
                semver: row.get(2)?,
                body: row.get(3)?,
                metadata: row.get(4)?,
                created_at: row.get(5)?,
                parent_uuid: row.get(6)?,
            })
        })?;
        
        match rows.next() {
            Some(row) => Ok(Some(row?)),
            None => Ok(None),
        }
    })?;
    
    log::debug!("Retrieved version {}: {}", version_uuid, result.is_some());
    
    Ok(result)
}