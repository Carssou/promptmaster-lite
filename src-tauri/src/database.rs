use rusqlite::{Connection, Result as SqliteResult};
use std::sync::{Arc, Mutex};
use tauri::Manager;
use crate::error::{AppError, Result};
use crate::migrations::MigrationManager;

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
        
        // Run migrations for existing databases
        let migrations_run = MigrationManager::run_migrations(&conn)?;
        if migrations_run > 0 {
            log::info!("Database updated with {} migrations", migrations_run);
            crate::migration_status::set_migrations_just_run();
        }
        
        // Initialize default data
        Self::initialize_default_data(&conn)?;
        
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
                category_path TEXT DEFAULT 'Uncategorized',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                prod_version_uuid TEXT
            );
            
            CREATE INDEX IF NOT EXISTS idx_category ON prompts(category_path);
            
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
            
            CREATE UNIQUE INDEX IF NOT EXISTS idx_versions_unique_semver 
            ON versions(prompt_uuid, semver);
            
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
                uuid,
                title,
                body,
                tags,
                notes
            );
            
            -- FTS sync triggers for versions table
            CREATE TRIGGER IF NOT EXISTS fts_versions_insert AFTER INSERT ON versions
            BEGIN
                INSERT INTO prompts_fts(uuid, title, body, tags, notes)
                SELECT 
                    NEW.uuid,
                    p.title,
                    NEW.body,
                    REPLACE(REPLACE(REPLACE(COALESCE(p.tags, ''), '[', ''), ']', ''), '"', ''),
                    COALESCE(json_extract(NEW.metadata, '$.notes'), '')
                FROM prompts p
                WHERE p.uuid = NEW.prompt_uuid;
            END;
            
            CREATE TRIGGER IF NOT EXISTS fts_versions_update AFTER UPDATE ON versions
            BEGIN
                DELETE FROM prompts_fts WHERE uuid = NEW.uuid;
                INSERT INTO prompts_fts(uuid, title, body, tags, notes)
                SELECT 
                    NEW.uuid,
                    p.title,
                    NEW.body,
                    REPLACE(REPLACE(REPLACE(COALESCE(p.tags, ''), '[', ''), ']', ''), '"', ''),
                    COALESCE(json_extract(NEW.metadata, '$.notes'), '')
                FROM prompts p
                WHERE p.uuid = NEW.prompt_uuid;
            END;
            
            CREATE TRIGGER IF NOT EXISTS fts_versions_delete AFTER DELETE ON versions
            BEGIN
                DELETE FROM prompts_fts WHERE uuid = OLD.uuid;
            END;
            
            -- FTS sync triggers for prompts table (title/tags updates)
            CREATE TRIGGER IF NOT EXISTS fts_prompts_update AFTER UPDATE ON prompts
            BEGIN
                UPDATE prompts_fts SET
                    title = NEW.title,
                    tags = REPLACE(REPLACE(REPLACE(COALESCE(NEW.tags, ''), '[', ''), ']', ''), '"', '')
                WHERE uuid IN (SELECT uuid FROM versions WHERE prompt_uuid = NEW.uuid);
            END;
            
            CREATE TABLE IF NOT EXISTS model_providers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                model_id TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                provider TEXT NOT NULL,
                active BOOLEAN DEFAULT TRUE,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            );
            
            CREATE INDEX IF NOT EXISTS idx_model_providers_active 
            ON model_providers(active);
            
            CREATE INDEX IF NOT EXISTS idx_model_providers_provider 
            ON model_providers(provider);
            "#,
        )?;
        
        Ok(())
    }
    
    fn initialize_default_data(_conn: &Connection) -> Result<()> {
        // No default model providers - let users add their own current models
        // This prevents the app from shipping with outdated model lists
        log::info!("Database initialized - model providers table ready for user input");
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
