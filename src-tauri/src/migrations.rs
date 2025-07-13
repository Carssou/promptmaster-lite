use rusqlite::Connection;
use crate::error::Result;

mod m001_fts5_setup;

pub struct MigrationManager;

impl MigrationManager {
    pub fn run_migrations(conn: &Connection) -> Result<i32> {
        // Create schema_version table if it doesn't exist
        conn.execute(
            "CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY)",
            [],
        )?;
        
        // Get current schema version
        let current_version: i32 = conn.query_row(
            "SELECT COALESCE(MAX(version), 0) FROM schema_version",
            [],
            |row| row.get(0)
        ).unwrap_or(0);
        
        log::info!("Current database schema version: {}", current_version);
        
        let mut migrations_run = 0;
        
        // Run each migration if needed
        if current_version < 1 {
            log::info!("Running migration 1: FTS5 setup");
            m001_fts5_setup::run(conn)?;
            conn.execute("INSERT OR REPLACE INTO schema_version (version) VALUES (1)", [])?;
            migrations_run += 1;
        }
        
        // Future migrations:
        // if current_version < 2 {
        //     log::info!("Running migration 2: Category indexes");
        //     m002_category_indexes::run(conn)?;
        //     conn.execute("INSERT OR REPLACE INTO schema_version (version) VALUES (2)", [])?;
        //     migrations_run += 1;
        // }
        
        if migrations_run > 0 {
            log::info!("Completed {} database migrations successfully", migrations_run);
        } else {
            log::debug!("Database schema is up to date (version {})", current_version);
        }
        Ok(migrations_run)
    }
}