use std::sync::{Arc, OnceLock};
use crate::database::DatabaseManager;
use crate::error::Result;

static DATABASE: OnceLock<Arc<DatabaseManager>> = OnceLock::new();

pub fn init_database(app_handle: &tauri::AppHandle) -> Result<()> {
    let db_manager = DatabaseManager::new(app_handle)?;
    DATABASE.set(Arc::new(db_manager))
        .map_err(|_| crate::error::AppError::Database(
            rusqlite::Error::SqliteFailure(
                rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
                Some("Database already initialized".to_string())
            )
        ))?;
    Ok(())
}

pub fn get_database() -> Result<Arc<DatabaseManager>> {
    DATABASE.get()
        .cloned()
        .ok_or_else(|| crate::error::AppError::Database(
            rusqlite::Error::SqliteFailure(
                rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
                Some("Database not initialized".to_string())
            )
        ))
}