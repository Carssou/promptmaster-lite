use std::fmt;

#[derive(Debug)]
pub enum AppError {
    Database(rusqlite::Error),
    Io(std::io::Error),
    Json(serde_json::Error),
    Tauri(tauri::Error),
    Path(String),
    InvalidInput(String),
    Validation(String),
    FileWatcher(notify::Error),
    Regex(regex::Error),
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            AppError::Database(e) => write!(f, "Database error: {}", e),
            AppError::Io(e) => write!(f, "IO error: {}", e),
            AppError::Json(e) => write!(f, "JSON error: {}", e),
            AppError::Tauri(e) => write!(f, "Tauri error: {}", e),
            AppError::Path(e) => write!(f, "Path error: {}", e),
            AppError::InvalidInput(e) => write!(f, "Invalid input: {}", e),
            AppError::Validation(e) => write!(f, "Validation error: {}", e),
            AppError::FileWatcher(e) => write!(f, "File watcher error: {}", e),
            AppError::Regex(e) => write!(f, "Regex error: {}", e),
        }
    }
}

impl std::error::Error for AppError {}

impl From<rusqlite::Error> for AppError {
    fn from(e: rusqlite::Error) -> Self {
        AppError::Database(e)
    }
}

impl From<std::io::Error> for AppError {
    fn from(e: std::io::Error) -> Self {
        AppError::Io(e)
    }
}

impl From<serde_json::Error> for AppError {
    fn from(e: serde_json::Error) -> Self {
        AppError::Json(e)
    }
}

impl From<tauri::Error> for AppError {
    fn from(e: tauri::Error) -> Self {
        AppError::Tauri(e)
    }
}

impl From<notify::Error> for AppError {
    fn from(e: notify::Error) -> Self {
        AppError::FileWatcher(e)
    }
}

impl From<regex::Error> for AppError {
    fn from(e: regex::Error) -> Self {
        AppError::Regex(e)
    }
}

// Convert AppError to String for Tauri commands
impl From<AppError> for String {
    fn from(e: AppError) -> Self {
        e.to_string()
    }
}

pub type Result<T> = std::result::Result<T, AppError>;
