use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use crate::db::get_database;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CategoryNode {
    pub path: String,
    pub name: String,
    pub children: Vec<CategoryNode>,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CategoryCount {
    pub category_path: String,
    pub count: i64,
}

/// Build category tree from database category_path strings
#[tauri::command]
pub fn get_category_tree() -> std::result::Result<Vec<CategoryNode>, String> {
    log::debug!("Building category tree from database");
    
    let db = get_database().map_err(|e| e.to_string())?;
    
    // Get all category paths with their prompt counts from the prompts table
    let category_counts = db.with_connection(|conn| {
        let mut stmt = conn.prepare(
            "SELECT category_path, COUNT(*) as count 
             FROM prompts 
             WHERE category_path IS NOT NULL 
             GROUP BY category_path 
             ORDER BY category_path"
        )?;
        
        let rows = stmt.query_map([], |row| {
            Ok(CategoryCount {
                category_path: row.get(0)?,
                count: row.get(1)?,
            })
        })?;
        
        let mut counts = Vec::new();
        for row in rows {
            counts.push(row?);
        }
        Ok(counts)
    }).map_err(|e| e.to_string())?;
    
    log::debug!("Found {} unique categories", category_counts.len());
    
    // Build tree structure from flat paths
    let tree = build_tree_from_paths(category_counts);
    
    Ok(tree)
}

/// Update a prompt's category
#[tauri::command]
pub fn update_prompt_category(prompt_uuid: String, category_path: String) -> std::result::Result<(), String> {
    log::debug!("Updating prompt {} category to: {}", prompt_uuid, category_path);
    
    // Validate category path
    if !is_valid_category_path(&category_path) {
        return Err("Category path contains invalid characters".to_string());
    }
    
    let db = get_database().map_err(|e| e.to_string())?;
    
    db.with_transaction(|tx| {
        // Update prompt category
        let rows_affected = tx.execute(
            "UPDATE prompts SET category_path = ?, updated_at = datetime('now') WHERE uuid = ?",
            [&category_path, &prompt_uuid],
        )?;
        
        if rows_affected == 0 {
            return Err(rusqlite::Error::QueryReturnedNoRows);
        }
        
        log::info!("Updated prompt {} category to: {}", prompt_uuid, category_path);
        Ok(())
    }).map_err(|e| e.to_string())?;
    
    Ok(())
}

/// Rename a category (updates all prompts in that category and subcategories)
#[tauri::command]
pub fn rename_category(old_path: String, new_path: String) -> std::result::Result<(), String> {
    log::debug!("Renaming category from '{}' to '{}'", old_path, new_path);
    
    // Don't allow renaming the "Uncategorized" category
    if old_path == "Uncategorized" {
        return Err("Cannot rename the 'Uncategorized' category (it's reserved)".to_string());
    }
    
    // Validate new category path
    if !is_valid_category_path(&new_path) {
        return Err("New category path contains invalid characters".to_string());
    }
    
    // Don't allow renaming to an existing category
    if old_path == new_path {
        return Err("New category path must be different from current path".to_string());
    }
    
    let db = get_database().map_err(|e| e.to_string())?;
    
    db.with_transaction(|tx| {
        // Check if new category already exists
        let existing_count: i64 = tx.query_row(
            "SELECT COUNT(*) FROM prompts WHERE category_path = ?",
            [&new_path],
            |row| row.get(0),
        )?;
        
        if existing_count > 0 {
            return Err(rusqlite::Error::SqliteFailure(
                rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_CONSTRAINT),
                Some(format!("Category '{}' already exists", new_path))
            ));
        }
        
        // Update exact matches
        let exact_rows = tx.execute(
            "UPDATE prompts SET category_path = ?, updated_at = datetime('now') 
             WHERE category_path = ?",
            [&new_path, &old_path],
        )?;
        
        // Update subcategories (those that start with old_path/)
        let subcategory_pattern = format!("{}/", old_path);
        let subcategory_length = subcategory_pattern.len() as i64 + 1;
        let subcategory_like_pattern = format!("{}%", subcategory_pattern);
        let subcategory_rows = tx.execute(
            "UPDATE prompts 
             SET category_path = ? || SUBSTR(category_path, ?), 
                 updated_at = datetime('now')
             WHERE category_path LIKE ?",
            [&new_path, &subcategory_length.to_string(), &subcategory_like_pattern],
        )?;
        
        let total_updated = exact_rows + subcategory_rows;
        log::info!("Renamed category '{}' to '{}', updated {} prompts", 
                   old_path, new_path, total_updated);
        
        if total_updated == 0 {
            return Err(rusqlite::Error::QueryReturnedNoRows);
        }
        
        Ok(())
    }).map_err(|e| e.to_string())?;
    
    Ok(())
}

/// Delete a category (moves prompts to parent category or "Uncategorized")
#[tauri::command]
pub fn delete_category(category_path: String) -> std::result::Result<(), String> {
    log::debug!("Deleting category: {}", category_path);
    
    // Don't allow deleting "Uncategorized"
    if category_path == "Uncategorized" {
        return Err("Cannot delete the 'Uncategorized' category".to_string());
    }
    
    let db = get_database().map_err(|e| e.to_string())?;
    
    db.with_transaction(|tx| {
        // Determine parent category
        let parent_category = get_parent_category(&category_path);
        
        // Update prompts in the deleted category to parent category
        let exact_rows = tx.execute(
            "UPDATE prompts SET category_path = ?, updated_at = datetime('now') 
             WHERE category_path = ?",
            [&parent_category, &category_path],
        )?;
        
        // Update subcategories to move up one level
        let subcategory_pattern = format!("{}/", category_path);
        let subcategory_length = subcategory_pattern.len() as i64 + 1;
        let subcategory_like_pattern = format!("{}%", subcategory_pattern);
        
        let subcategory_rows = if parent_category == "Uncategorized" {
            // Move to root level (remove prefix)
            tx.execute(
                "UPDATE prompts 
                 SET category_path = SUBSTR(category_path, ?),
                     updated_at = datetime('now')
                 WHERE category_path LIKE ?",
                [&subcategory_length.to_string(), &subcategory_like_pattern],
            )?
        } else {
            // Move to parent prefix
            let new_prefix = format!("{}/", parent_category);
            tx.execute(
                "UPDATE prompts 
                 SET category_path = ? || SUBSTR(category_path, ?),
                     updated_at = datetime('now')
                 WHERE category_path LIKE ?",
                [&new_prefix, &subcategory_length.to_string(), &subcategory_like_pattern],
            )?
        };
        
        let total_updated = exact_rows + subcategory_rows;
        log::info!("Deleted category '{}', moved {} prompts to parent category '{}'", 
                   category_path, total_updated, parent_category);
        
        if total_updated == 0 {
            log::warn!("No prompts found in category '{}'", category_path);
        }
        
        Ok(())
    }).map_err(|e| e.to_string())?;
    
    Ok(())
}

/// Build tree structure from flat category paths
fn build_tree_from_paths(category_counts: Vec<CategoryCount>) -> Vec<CategoryNode> {
    let mut path_map: HashMap<String, CategoryNode> = HashMap::new();
    
    // First pass: create all nodes and their parent nodes
    for category in &category_counts {
        let parts: Vec<&str> = category.category_path.split('/').collect();
        
        // Create all parent nodes if they don't exist
        for i in 1..=parts.len() {
            let current_path = parts[0..i].join("/");
            let current_name = parts[i-1].to_string();
            
            if !path_map.contains_key(&current_path) {
                path_map.insert(current_path.clone(), CategoryNode {
                    path: current_path,
                    name: current_name,
                    children: Vec::new(),
                    count: 0, // Will be calculated later
                });
            }
        }
        
        // Set the actual count for nodes that have prompts
        if let Some(node) = path_map.get_mut(&category.category_path) {
            node.count = category.count;
        }
    }
    
    
    // Second pass: build parent-child relationships
    let mut children_to_move: Vec<(String, String)> = Vec::new();
    
    for (path, _) in &path_map {
        let parts: Vec<&str> = path.split('/').collect();
        
        if parts.len() > 1 {
            // Child category - find parent
            let parent_path = parts[..parts.len() - 1].join("/");
            children_to_move.push((parent_path, path.clone()));
        }
    }
    
    // Move children to their parents
    for (parent_path, child_path) in children_to_move {
        if let Some(child) = path_map.remove(&child_path) {
            if let Some(parent) = path_map.get_mut(&parent_path) {
                parent.children.push(child);
            }
        }
    }
    
    // Collect remaining nodes as roots
    let mut roots: Vec<CategoryNode> = path_map.into_values().collect();
    
    // Calculate total counts including children
    for root in &mut roots {
        calculate_total_counts(root);
    }
    
    // Sort roots and children alphabetically
    roots.sort_by(|a, b| a.name.cmp(&b.name));
    sort_children(&mut roots);
    
    roots
}


/// Recursively calculate total counts including children
fn calculate_total_counts(node: &mut CategoryNode) -> i64 {
    let mut total = node.count;
    
    for child in &mut node.children {
        total += calculate_total_counts(child);
    }
    
    node.count = total;
    total
}

/// Recursively sort children alphabetically
fn sort_children(nodes: &mut [CategoryNode]) {
    for node in nodes {
        node.children.sort_by(|a, b| a.name.cmp(&b.name));
        sort_children(&mut node.children);
    }
}

/// Get parent category path
fn get_parent_category(category_path: &str) -> String {
    let parts: Vec<&str> = category_path.split('/').collect();
    if parts.len() <= 1 {
        "Uncategorized".to_string()
    } else {
        parts[..parts.len() - 1].join("/")
    }
}

/// Validate category path contains only printable ASCII characters
fn is_valid_category_path(path: &str) -> bool {
    path.chars().all(|c| {
        c.is_ascii() && 
        !c.is_control() && 
        c != '\\' && 
        c != '<' && 
        c != '>' && 
        c != ':' && 
        c != '"' && 
        c != '|' && 
        c != '?' && 
        c != '*'
    }) && !path.is_empty()
}

/// Create a new category (creates empty placeholder to ensure category exists in tree)
#[tauri::command]
pub fn create_category(category_path: String) -> std::result::Result<(), String> {
    log::debug!("Creating category: {}", category_path);
    
    // Validate category path
    if !is_valid_category_path(&category_path) {
        return Err("Category path contains invalid characters".to_string());
    }
    
    if category_path == "Uncategorized" {
        return Err("Cannot create 'Uncategorized' category (it's reserved)".to_string());
    }
    
    let db = get_database().map_err(|e| e.to_string())?;
    
    db.with_connection(|conn| {
        // Check if category already exists (has any prompts)
        let existing_count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM prompts WHERE category_path = ? OR category_path LIKE ?",
            [&category_path, &format!("{}/%", category_path)],
            |row| row.get(0),
        )?;
        
        if existing_count > 0 {
            return Err(rusqlite::Error::SqliteFailure(
                rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_CONSTRAINT),
                Some(format!("Category '{}' already exists", category_path))
            ));
        }
        
        log::info!("Category '{}' is ready for use", category_path);
        Ok(())
    }).map_err(|e| e.to_string())?;
    
    Ok(())
}

/// Get prompts filtered by category (including subcategories for parent categories)
#[tauri::command]
pub fn get_prompts_by_category(category_path: String) -> std::result::Result<Vec<PromptSummary>, String> {
    log::debug!("Getting prompts for category: {}", category_path);
    
    let db = get_database().map_err(|e| e.to_string())?;
    
    let prompts = db.with_connection(|conn| {
        if category_path == "Uncategorized" {
            // For "Uncategorized", get only exact matches
            let mut stmt = conn.prepare(
                "SELECT uuid, title, tags, created_at, updated_at, category_path 
                 FROM prompts 
                 WHERE category_path = ? 
                 ORDER BY updated_at DESC"
            )?;
            
            let rows = stmt.query_map([&category_path], |row| {
                Ok(PromptSummary {
                    uuid: row.get(0)?,
                    title: row.get(1)?,
                    tags: row.get::<_, Option<String>>(2)?.unwrap_or_default(),
                    created_at: row.get(3)?,
                    updated_at: row.get(4)?,
                    category_path: row.get::<_, Option<String>>(5)?.unwrap_or_else(|| "Uncategorized".to_string()),
                })
            })?;
            
            let mut prompts = Vec::new();
            for row in rows {
                prompts.push(row?);
            }
            
            log::debug!("Found {} prompts for category '{}'", prompts.len(), category_path);
            Ok(prompts)
        } else {
            // For other categories, get exact matches AND subcategories
            let like_pattern = format!("{}/%", category_path);
            let mut stmt = conn.prepare(
                "SELECT uuid, title, tags, created_at, updated_at, category_path 
                 FROM prompts 
                 WHERE category_path = ? OR category_path LIKE ? 
                 ORDER BY updated_at DESC"
            )?;
            
            let rows = stmt.query_map([&category_path, &like_pattern], |row| {
                Ok(PromptSummary {
                    uuid: row.get(0)?,
                    title: row.get(1)?,
                    tags: row.get::<_, Option<String>>(2)?.unwrap_or_default(),
                    created_at: row.get(3)?,
                    updated_at: row.get(4)?,
                    category_path: row.get::<_, Option<String>>(5)?.unwrap_or_else(|| "Uncategorized".to_string()),
                })
            })?;
            
            let mut prompts = Vec::new();
            for row in rows {
                prompts.push(row?);
            }
            
            log::debug!("Found {} prompts for category '{}'", prompts.len(), category_path);
            Ok(prompts)
        }
    }).map_err(|e| e.to_string())?;
    
    Ok(prompts)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PromptSummary {
    pub uuid: String,
    pub title: String,
    pub tags: String,
    pub created_at: String,
    pub updated_at: String,
    pub category_path: String,
}