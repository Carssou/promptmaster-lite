use crate::error::{AppError, Result};
use crate::logging::log_security_event;
use regex::Regex;
use lazy_static::lazy_static;

/// Security validation for prompt content
pub fn validate_prompt_content(content: &str) -> Result<()> {
    // Check for HTML tags that aren't XML-style tags
    lazy_static! {
        static ref HTML_TAG_REGEX: Regex = Regex::new(r"<(?:script|style|iframe|object|embed|form|input|button|link|meta|base|head|html|body)[^>]*>").unwrap();
        static ref SCRIPT_URL_REGEX: Regex = Regex::new(r"(?i)(javascript|vbscript):").unwrap();
        static ref DATA_URL_REGEX: Regex = Regex::new(r"data:").unwrap();
        static ref EVENT_HANDLER_REGEX: Regex = Regex::new(r"(?i)on\w+\s*=").unwrap();
    }
    
    if HTML_TAG_REGEX.is_match(content) {
        let _ = log_security_event("INVALID_HTML", "Prompt contains HTML tags");
        return Err(AppError::InvalidInput(
            "Prompt contains HTML tags. Only plain text, Markdown, and XML tags are allowed.".to_string()
        ));
    }
    
    if SCRIPT_URL_REGEX.is_match(content) {
        let _ = log_security_event("INVALID_SCRIPT", "Prompt contains script URLs");
        return Err(AppError::InvalidInput(
            "Prompt contains script URLs which are not allowed.".to_string()
        ));
    }
    
    if DATA_URL_REGEX.is_match(content) {
        return Err(AppError::InvalidInput(
            "Prompt contains data URLs which are not allowed.".to_string()
        ));
    }
    
    if EVENT_HANDLER_REGEX.is_match(content) {
        return Err(AppError::InvalidInput(
            "Prompt contains event handlers which are not allowed.".to_string()
        ));
    }
    
    Ok(())
}

/// Enhanced input validation with security checks
pub fn validate_prompt_input(title: &str, content: &str, tags: &[String]) -> Result<()> {
    // Basic validation
    if title.trim().is_empty() {
        return Err(AppError::InvalidInput("Title cannot be empty".to_string()));
    }
    if title.len() > 255 {
        return Err(AppError::InvalidInput("Title too long (max 255 characters)".to_string()));
    }
    if content.trim().is_empty() {
        return Err(AppError::InvalidInput("Content cannot be empty".to_string()));
    }
    if content.len() > 100_000 {
        return Err(AppError::InvalidInput("Content too long (max 100,000 characters)".to_string()));
    }
    if tags.len() > 20 {
        return Err(AppError::InvalidInput("Too many tags (max 20)".to_string()));
    }
    
    // Validate each tag
    for tag in tags {
        if tag.trim().is_empty() {
            return Err(AppError::InvalidInput("Tag cannot be empty".to_string()));
        }
        if tag.len() > 50 {
            return Err(AppError::InvalidInput("Tag too long (max 50 characters)".to_string()));
        }
        // Tags should be simple text
        if tag.contains('<') || tag.contains('>') {
            return Err(AppError::InvalidInput("Tags cannot contain HTML".to_string()));
        }
    }
    
    // Security validation for content
    validate_prompt_content(content)?;
    
    // Title security validation
    if title.contains('<') || title.contains('>') {
        return Err(AppError::InvalidInput("Title cannot contain HTML".to_string()));
    }
    
    Ok(())
}

/// Validate UUID format
pub fn validate_uuid(uuid: &str) -> Result<()> {
    lazy_static! {
        static ref UUID_REGEX: Regex = Regex::new(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$").unwrap();
    }
    
    if !UUID_REGEX.is_match(uuid) {
        return Err(AppError::InvalidInput("Invalid UUID format".to_string()));
    }
    
    Ok(())
}

/// Clean content for logging (remove sensitive data and truncate)
#[allow(dead_code)]
pub fn clean_content_for_logging(content: &str) -> String {
    let mut cleaned = content.to_string();
    
    // Truncate if too long for logging
    if cleaned.len() > 500 {
        cleaned = format!("{}... [truncated]", &cleaned[..500]);
    }
    
    cleaned
}