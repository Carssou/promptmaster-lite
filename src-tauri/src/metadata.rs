use serde::{Deserialize, Serialize};
use serde_json;
use crate::db::get_database;
use crate::error::{AppError, Result};
use rusqlite::{params, OptionalExtension};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PromptMetadata {
    pub title: Option<String>,
    pub tags: Option<Vec<String>>,
    pub models: Option<Vec<String>>,
    pub category_path: Option<String>,
    pub notes: Option<String>,
    pub custom_fields: Option<serde_json::Value>,
}

impl Default for PromptMetadata {
    fn default() -> Self {
        Self {
            title: None,
            tags: None,
            models: None,
            category_path: Some("Uncategorized".to_string()),
            notes: None,
            custom_fields: None,
        }
    }
}

impl PromptMetadata {
    /// Parse metadata from JSON string
    pub fn from_json(json_str: &str) -> Result<Self> {
        serde_json::from_str(json_str)
            .map_err(|e| AppError::Validation(format!("Invalid metadata JSON: {}", e)))
    }

    /// Convert metadata to JSON string
    pub fn to_json(&self) -> Result<String> {
        serde_json::to_string(self)
            .map_err(|e| AppError::Validation(format!("Failed to serialize metadata: {}", e)))
    }

    /// Merge with another metadata object, preferring non-None values from other
    pub fn merge_with(&mut self, other: &PromptMetadata) {
        if other.title.is_some() {
            self.title = other.title.clone();
        }
        if other.tags.is_some() {
            self.tags = other.tags.clone();
        }
        if other.models.is_some() {
            self.models = other.models.clone();
        }
        if other.category_path.is_some() {
            self.category_path = other.category_path.clone();
        }
        if other.notes.is_some() {
            self.notes = other.notes.clone();
        }
        if other.custom_fields.is_some() {
            self.custom_fields = other.custom_fields.clone();
        }
    }

    /// Validate metadata constraints
    pub fn validate(&self) -> Result<()> {
        // Validate title
        if let Some(ref title) = self.title {
            if title.trim().is_empty() {
                return Err(AppError::Validation("Title cannot be empty".to_string()));
            }
            if title.len() > 255 {
                return Err(AppError::Validation("Title cannot exceed 255 characters".to_string()));
            }
        }

        // Validate tags
        if let Some(ref tags) = self.tags {
            if tags.len() > 10 {
                return Err(AppError::Validation("Maximum 10 tags allowed".to_string()));
            }
            for tag in tags {
                if tag.len() > 25 {
                    return Err(AppError::Validation("Each tag must be 25 characters or less".to_string()));
                }
                if tag.trim().is_empty() {
                    return Err(AppError::Validation("Tags cannot be empty".to_string()));
                }
            }
        }

        // Validate category path
        if let Some(ref category_path) = self.category_path {
            if category_path.len() > 255 {
                return Err(AppError::Validation("Category path cannot exceed 255 characters".to_string()));
            }
            // Validate printable ASCII only for security
            if !category_path.chars().all(|c| c.is_ascii() && !c.is_control()) {
                return Err(AppError::Validation("Category path must contain only printable ASCII characters".to_string()));
            }
        }

        // Validate notes
        if let Some(ref notes) = self.notes {
            if notes.len() > 10000 {
                return Err(AppError::Validation("Notes cannot exceed 10,000 characters".to_string()));
            }
        }

        Ok(())
    }
}

/// Get metadata for a specific version
#[tauri::command]
pub async fn metadata_get(version_uuid: String) -> std::result::Result<PromptMetadata, String> {
    log::info!("Getting metadata for version: {}", version_uuid);
    
    let db = get_database()?;
    
    let metadata_json = db.with_connection(|conn| {
        let mut stmt = conn.prepare(
            "SELECT metadata FROM versions WHERE uuid = ?1"
        )?;
        
        let metadata: Option<String> = stmt.query_row(params![version_uuid], |row| {
            Ok(row.get(0)?)
        }).optional()?;
        
        Ok(metadata)
    })?;
    
    match metadata_json {
        Some(json_str) => {
            log::debug!("Found metadata JSON: {}", json_str);
            PromptMetadata::from_json(&json_str).map_err(|e| e.to_string())
        }
        None => {
            log::debug!("No metadata found for version {}, returning default", version_uuid);
            Ok(PromptMetadata::default())
        }
    }
}

/// Update metadata for a specific version
#[tauri::command]
pub async fn metadata_update(version_uuid: String, payload_json: String) -> std::result::Result<PromptMetadata, String> {
    log::info!("Updating metadata for version: {}", version_uuid);
    log::debug!("Payload JSON: {}", payload_json);
    
    // Parse the incoming metadata
    let new_metadata = PromptMetadata::from_json(&payload_json)?;
    
    // Validate the new metadata
    new_metadata.validate()?;
    
    let db = get_database()?;
    
    let final_metadata = db.with_transaction(|tx| {
        // Get existing metadata
        let existing_metadata_json: Option<String> = tx.query_row(
            "SELECT metadata FROM versions WHERE uuid = ?1",
            params![version_uuid],
            |row| Ok(row.get(0)?)
        ).optional()?;
        
        // Merge with existing metadata
        let mut final_metadata = match existing_metadata_json {
            Some(json_str) => PromptMetadata::from_json(&json_str)
                .unwrap_or_else(|_| PromptMetadata::default()),
            None => PromptMetadata::default(),
        };
        
        final_metadata.merge_with(&new_metadata);
        
        // Convert to JSON
        let final_json = final_metadata.to_json()
            .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?;
        
        // Update the database
        tx.execute(
            "UPDATE versions SET metadata = ?1 WHERE uuid = ?2",
            params![final_json, version_uuid]
        )?;
        
        // Also update the prompts table with extracted fields for easier querying
        if let Some(ref title) = final_metadata.title {
            tx.execute(
                "UPDATE prompts SET title = ?1, updated_at = datetime('now') WHERE uuid = (SELECT prompt_uuid FROM versions WHERE uuid = ?2)",
                params![title, version_uuid]
            )?;
        }
        
        if let Some(ref tags) = final_metadata.tags {
            let tags_json = serde_json::to_string(tags)
                .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?;
            tx.execute(
                "UPDATE prompts SET tags = ?1, updated_at = datetime('now') WHERE uuid = (SELECT prompt_uuid FROM versions WHERE uuid = ?2)",
                params![tags_json, version_uuid]
            )?;
        }
        
        Ok(final_metadata)
    })?;
    
    log::info!("Successfully updated metadata for version: {}", version_uuid);
    Ok(final_metadata)
}

/// Get all unique tags from the database for autocomplete
#[tauri::command]
pub async fn metadata_get_all_tags() -> std::result::Result<Vec<String>, String> {
    log::info!("Getting all unique tags for autocomplete");
    
    let db = get_database()?;
    
    let tags = db.with_connection(|conn| {
        let mut stmt = conn.prepare(
            "SELECT DISTINCT tags FROM prompts WHERE tags IS NOT NULL AND tags != ''"
        )?;
        
        let tag_rows = stmt.query_map([], |row| {
            let tags_json: String = row.get(0)?;
            Ok(tags_json)
        })?;
        
        let mut all_tags = std::collections::HashSet::new();
        
        for tag_row in tag_rows {
            if let Ok(tags_json) = tag_row {
                if let Ok(tags_vec) = serde_json::from_str::<Vec<String>>(&tags_json) {
                    for tag in tags_vec {
                        all_tags.insert(tag.to_lowercase());
                    }
                }
            }
        }
        
        let mut sorted_tags: Vec<String> = all_tags.into_iter().collect();
        sorted_tags.sort();
        
        Ok(sorted_tags)
    })?;
    
    log::debug!("Found {} unique tags", tags.len());
    Ok(tags)
}

/// Get all available model providers
#[tauri::command]
pub async fn metadata_get_model_providers() -> std::result::Result<Vec<ModelProvider>, String> {
    log::info!("Getting all model providers from database");
    
    let db = get_database()?;
    
    let providers = db.with_connection(|conn| {
        let mut stmt = conn.prepare(
            "SELECT model_id, name, provider, active FROM model_providers WHERE active = 1 ORDER BY provider, name"
        )?;
        
        let provider_iter = stmt.query_map([], |row| {
            Ok(ModelProvider {
                id: row.get(0)?,
                name: row.get(1)?,
                provider: row.get(2)?,
                active: row.get::<_, i32>(3)? == 1,
            })
        })?;
        
        let mut providers = Vec::new();
        for provider in provider_iter {
            providers.push(provider?);
        }
        
        Ok(providers)
    })?;
    
    log::debug!("Found {} active model providers", providers.len());
    Ok(providers)
}

/// Add a new model provider
#[tauri::command]
pub async fn metadata_add_model_provider(
    model_id: String,
    name: String,
    provider: String,
) -> std::result::Result<ModelProvider, String> {
    log::info!("Adding new model provider: {} ({})", name, model_id);
    
    // Validate input
    if model_id.trim().is_empty() || name.trim().is_empty() || provider.trim().is_empty() {
        return Err("Model ID, name, and provider cannot be empty".to_string());
    }
    
    if model_id.len() > 100 || name.len() > 100 || provider.len() > 50 {
        return Err("Model ID, name, or provider too long".to_string());
    }
    
    let db = get_database()?;
    
    let model_provider = db.with_connection(|conn| {
        // Check if model_id already exists
        let exists: i64 = conn.query_row(
            "SELECT COUNT(*) FROM model_providers WHERE model_id = ?1",
            params![&model_id],
            |row| row.get(0)
        )?;
        
        if exists > 0 {
            return Err(rusqlite::Error::SqliteFailure(
                rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_CONSTRAINT),
                Some("Model ID already exists".to_string())
            ));
        }
        
        // Insert new model provider
        conn.execute(
            "INSERT INTO model_providers (model_id, name, provider, active) VALUES (?1, ?2, ?3, ?4)",
            params![&model_id, &name, &provider, true]
        )?;
        
        Ok(ModelProvider {
            id: model_id,
            name,
            provider,
            active: true,
        })
    })?;
    
    log::info!("Successfully added model provider: {}", model_provider.name);
    Ok(model_provider)
}

/// Remove a model provider
#[tauri::command]
pub async fn metadata_remove_model_provider(model_id: String) -> std::result::Result<bool, String> {
    log::info!("Removing model provider: {}", model_id);
    
    let db = get_database()?;
    
    let removed = db.with_connection(|conn| {
        let rows_affected = conn.execute(
            "DELETE FROM model_providers WHERE model_id = ?1",
            params![&model_id]
        )?;
        
        Ok(rows_affected > 0)
    })?;
    
    if removed {
        log::info!("Successfully removed model provider: {}", model_id);
    } else {
        log::warn!("Model provider not found: {}", model_id);
    }
    
    Ok(removed)
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ModelProvider {
    pub id: String,
    pub name: String,
    pub provider: String,
    pub active: bool,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_metadata_validation() {
        let mut metadata = PromptMetadata::default();
        
        // Valid metadata should pass
        metadata.title = Some("Test Title".to_string());
        metadata.tags = Some(vec!["tag1".to_string(), "tag2".to_string()]);
        assert!(metadata.validate().is_ok());
        
        // Empty title should fail
        metadata.title = Some("".to_string());
        assert!(metadata.validate().is_err());
        
        // Too many tags should fail
        metadata.title = Some("Valid Title".to_string());
        metadata.tags = Some((0..11).map(|i| format!("tag{}", i)).collect());
        assert!(metadata.validate().is_err());
        
        // Tag too long should fail
        metadata.tags = Some(vec!["a".repeat(26)]);
        assert!(metadata.validate().is_err());
    }

    #[test]
    fn test_metadata_merge() {
        let mut base = PromptMetadata::default();
        base.title = Some("Original Title".to_string());
        base.tags = Some(vec!["tag1".to_string()]);
        
        let update = PromptMetadata {
            title: Some("New Title".to_string()),
            tags: None,
            models: Some(vec!["gpt-4".to_string()]),
            category_path: None,
            notes: Some("New notes".to_string()),
            custom_fields: None,
        };
        
        base.merge_with(&update);
        
        assert_eq!(base.title, Some("New Title".to_string()));
        assert_eq!(base.tags, Some(vec!["tag1".to_string()])); // Should keep original
        assert_eq!(base.models, Some(vec!["gpt-4".to_string()]));
        assert_eq!(base.notes, Some("New notes".to_string()));
    }
}
