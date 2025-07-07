use rusqlite::{Connection, Result as SqliteResult};
use std::sync::{Arc, Mutex};
use tauri::Manager;
use crate::error::{AppError, Result};

pub struct DatabaseManager {
    connection: Arc<Mutex<Connection>>,
}

impl DatabaseManager {
    pub fn new(app_handle: &tauri::AppHandle) -> Result<Self> {
        let documents_dir = app_handle
            .path()
            .document_dir()
            .map_err(|e| AppError::Path(e.to_string()))?;

        let app_dir = documents_dir.join("PromptMaster");
        std::fs::create_dir_all(&app_dir)?;
        let db_path = app_dir.join("promptmaster.db");
        
        let conn = Connection::open(db_path)?;
        
        // Initialize database schema
        Self::create_tables(&conn)?;
        
        Ok(DatabaseManager {
            connection: Arc::new(Mutex::new(conn)),
        })
    }
    
    fn create_tables(conn: &Connection) -> Result<()> {
        conn.execute_batch(
            r#"
            CREATE TABLE IF NOT EXISTS prompts (
                uuid TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                tags TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                prod_version_uuid TEXT
            );
            
            CREATE TABLE IF NOT EXISTS versions (
                uuid TEXT PRIMARY KEY,
                prompt_uuid TEXT NOT NULL,
                semver TEXT NOT NULL,
                body TEXT NOT NULL,
                metadata TEXT,
                created_at TEXT NOT NULL,
                parent_uuid TEXT,
                FOREIGN KEY (prompt_uuid) REFERENCES prompts(uuid)
            );
            
            CREATE INDEX IF NOT EXISTS idx_versions_prompt 
            ON versions(prompt_uuid);
            
            CREATE INDEX IF NOT EXISTS idx_versions_content 
            ON versions(prompt_uuid, body);
            
            CREATE TABLE IF NOT EXISTS runs (
                uuid TEXT PRIMARY KEY,
                version_uuid TEXT NOT NULL,
                model TEXT,
                input TEXT,
                output TEXT,
                bleu REAL,
                rouge REAL,
                judge_score REAL,
                prompt_tokens INT,
                completion_tokens INT,
                cost_usd REAL,
                created_at TEXT,
                FOREIGN KEY (version_uuid) REFERENCES versions(uuid)
            );
            
            CREATE INDEX IF NOT EXISTS idx_runs_version 
            ON runs(version_uuid);
            
            CREATE VIRTUAL TABLE IF NOT EXISTS prompts_fts USING fts5(
                title, body, tags,
                content_rowid=rowid
            );
            "#,
        )?;
        
        Ok(())
    }
    
    pub fn with_connection<F, R>(&self, f: F) -> Result<R>
    where
        F: FnOnce(&Connection) -> SqliteResult<R>,
    {
        let conn = self.connection.lock()
            .map_err(|e| AppError::Database(rusqlite::Error::SqliteFailure(
                rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_BUSY),
                Some(format!("Failed to acquire database lock: {}", e))
            )))?;
        
        f(&*conn).map_err(AppError::from)
    }
    
    pub fn with_transaction<F, R>(&self, f: F) -> Result<R>
    where
        F: FnOnce(&rusqlite::Transaction) -> SqliteResult<R>,
    {
        let conn = self.connection.lock()
            .map_err(|e| AppError::Database(rusqlite::Error::SqliteFailure(
                rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_BUSY),
                Some(format!("Failed to acquire database lock: {}", e))
            )))?;
        
        let tx = conn.unchecked_transaction()?;
        let result = f(&tx)?;
        tx.commit()?;
        Ok(result)
    }
}