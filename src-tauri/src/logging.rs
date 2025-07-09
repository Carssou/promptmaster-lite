use std::fs::{File, OpenOptions};
use std::io::{Write, BufWriter};
use std::sync::Mutex;
use chrono::Utc;
use lazy_static::lazy_static;
use tauri::Manager;
use crate::error::Result;

lazy_static! {
    static ref LOG_FILE: Mutex<Option<BufWriter<File>>> = Mutex::new(None);
}

/// Initialize the application logging system
pub fn init_app_logging(app_handle: &tauri::AppHandle) -> Result<()> {
    // Try to get documents directory, but don't fail if it doesn't work
    let log_file_path = match app_handle.path().document_dir() {
        Ok(documents_dir) => {
            let log_dir = documents_dir.join("PromptMaster");
            if let Err(e) = std::fs::create_dir_all(&log_dir) {
                log::warn!("Could not create log directory: {}", e);
                return Ok(()); // Continue without file logging
            }
            log_dir.join("promptmaster.log")
        }
        Err(e) => {
            log::warn!("Could not get documents directory: {}", e);
            return Ok(()); // Continue without file logging
        }
    };
    
    // Try to open log file, but don't fail if it doesn't work
    match OpenOptions::new().create(true).append(true).open(&log_file_path) {
        Ok(file) => {
            let writer = BufWriter::new(file);
            
            // Initialize the global log file
            if let Ok(mut log_file) = LOG_FILE.lock() {
                *log_file = Some(writer);
                log::info!("Application logging initialized: {:?}", log_file_path);
                // Don't write to the log file during initialization to avoid deadlock
            }
        }
        Err(e) => {
            log::warn!("Could not open log file: {}", e);
            // Continue without file logging
        }
    }
    
    Ok(())
}

/// Write a log entry to the application log file
pub fn write_app_log(level: &str, message: &str, context: Option<&str>) -> Result<()> {
    let timestamp = Utc::now().format("%Y-%m-%d %H:%M:%S UTC");
    
    let log_entry = match context {
        Some(ctx) => format!("[{}] {} - {} ({})\n", timestamp, level, message, ctx),
        None => format!("[{}] {} - {}\n", timestamp, level, message),
    };
    
    // Use a timeout to avoid potential deadlocks
    if let Ok(mut log_file) = LOG_FILE.lock() {
        if let Some(ref mut writer) = *log_file {
            // Ignore write errors to prevent app from crashing
            if let Err(e) = writer.write_all(log_entry.as_bytes()) {
                eprintln!("Log write error: {}", e);
            }
            if let Err(e) = writer.flush() {
                eprintln!("Log flush error: {}", e);
            }
        }
    }
    
    Ok(())
}

/// Log a security event
pub fn log_security_event(event_type: &str, details: &str) -> Result<()> {
    let message = format!("SECURITY: {} - {}", event_type, details);
    write_app_log("WARN", &message, None)?;
    log::warn!("{}", message);
    Ok(())
}

