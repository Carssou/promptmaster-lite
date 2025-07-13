use crate::db::get_database;
use serde::Serialize;

use std::sync::Mutex;

static MIGRATIONS_JUST_RUN: Mutex<bool> = Mutex::new(false);

#[derive(Serialize)]
pub struct MigrationStatus {
    pub current_version: i32,
    pub migrations_pending: bool,
    pub migrations_just_run: bool,
}

pub fn set_migrations_just_run() {
    if let Ok(mut flag) = MIGRATIONS_JUST_RUN.lock() {
        *flag = true;
    }
}

#[derive(Serialize)]
pub struct DatabaseDebugInfo {
    pub schema_version: i32,
    pub prompts_count: i32,
    pub versions_count: i32,
    pub fts_count: i32,
    pub fts_table_exists: bool,
}

#[tauri::command]
pub async fn get_migration_status() -> std::result::Result<MigrationStatus, String> {
    let db = get_database().map_err(|e| e.to_string())?;
    
    let status = db.with_connection(|conn| {
        // Get current schema version
        let current_version: i32 = conn.query_row(
            "SELECT COALESCE(MAX(version), 0) FROM schema_version",
            [],
            |row| row.get(0)
        ).unwrap_or(0);
        
        // For now, latest version is 1
        let latest_version = 1;
        let migrations_pending = current_version < latest_version;
        
        let migrations_just_run = MIGRATIONS_JUST_RUN.lock()
            .map(|flag| *flag)
            .unwrap_or(false);
        
        Ok(MigrationStatus {
            current_version,
            migrations_pending,
            migrations_just_run,
        })
    }).map_err(|e| e.to_string())?;
    
    Ok(status)
}