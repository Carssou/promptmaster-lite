use std::fmt;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct StructuredError {
    pub code: String,
    pub message: String,
    pub details: Option<String>,
}

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

// Convert AppError to String for Tauri commands (legacy support)
impl From<AppError> for String {
    fn from(e: AppError) -> Self {
        e.to_string()
    }
}

impl AppError {
    /// Convert AppError to a structured error for better frontend handling
    pub fn to_structured(&self) -> StructuredError {
        match self {
            AppError::Database(e) => StructuredError {
                code: "DATABASE_ERROR".to_string(),
                message: "Database operation failed".to_string(),
                details: Some(e.to_string()),
            },
            AppError::Io(e) => StructuredError {
                code: "IO_ERROR".to_string(),
                message: "File system operation failed".to_string(),
                details: Some(e.to_string()),
            },
            AppError::Json(e) => StructuredError {
                code: "JSON_ERROR".to_string(),
                message: "JSON parsing failed".to_string(),
                details: Some(e.to_string()),
            },
            AppError::Tauri(e) => StructuredError {
                code: "TAURI_ERROR".to_string(),
                message: "Tauri framework error".to_string(),
                details: Some(e.to_string()),
            },
            AppError::Path(msg) => StructuredError {
                code: "PATH_ERROR".to_string(),
                message: "File path error".to_string(),
                details: Some(msg.clone()),
            },
            AppError::InvalidInput(msg) => StructuredError {
                code: "INVALID_INPUT".to_string(),
                message: msg.clone(),
                details: None,
            },
            AppError::Validation(msg) => StructuredError {
                code: "VALIDATION_ERROR".to_string(),
                message: msg.clone(),
                details: None,
            },
            AppError::FileWatcher(e) => StructuredError {
                code: "FILE_WATCHER_ERROR".to_string(),
                message: "File watcher operation failed".to_string(),
                details: Some(e.to_string()),
            },
            AppError::Regex(e) => StructuredError {
                code: "REGEX_ERROR".to_string(),
                message: "Regular expression error".to_string(),
                details: Some(e.to_string()),
            },
        }
    }

    /// Get error code for logging and categorization
    pub fn code(&self) -> &'static str {
        match self {
            AppError::Database(_) => "DATABASE_ERROR",
            AppError::Io(_) => "IO_ERROR", 
            AppError::Json(_) => "JSON_ERROR",
            AppError::Tauri(_) => "TAURI_ERROR",
            AppError::Path(_) => "PATH_ERROR",
            AppError::InvalidInput(_) => "INVALID_INPUT",
            AppError::Validation(_) => "VALIDATION_ERROR",
            AppError::FileWatcher(_) => "FILE_WATCHER_ERROR",
            AppError::Regex(_) => "REGEX_ERROR",
        }
    }
}

pub type Result<T> = std::result::Result<T, AppError>;
