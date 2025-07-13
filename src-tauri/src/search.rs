use crate::db::get_database;
use serde::Serialize;

#[derive(Serialize)]
pub struct SearchHit {
    pub uuid: String,
    pub title: String,
    pub snippet: String,
    pub rank: f64,
}

#[derive(Serialize)]
pub struct SearchResults {
    pub hits: Vec<SearchHit>,
    pub total_count: usize,
    pub query: String,
}

#[tauri::command]
pub async fn search_prompts(
    query: String,
    limit: Option<usize>,
    offset: Option<usize>,
) -> std::result::Result<SearchResults, String> {
    // Input validation
    if query.trim().is_empty() {
        return Ok(SearchResults {
            hits: vec![],
            total_count: 0,
            query: query.clone(),
        });
    }
    
    if query.len() > 500 {
        return Err("Search query too long (max 500 characters)".to_string());
    }
    
    // Use query as-is since frontend already sanitizes it
    let sanitized_query = query.clone();
    
    let db = get_database().map_err(|e| e.to_string())?;
    
    let search_limit = limit.unwrap_or(20).min(100); // Cap at 100 results
    let search_offset = offset.unwrap_or(0);
    
    let results = db.with_connection(|conn| {
        log::info!("Executing search query: '{}'", sanitized_query);
        
        // First, get the total count for this query
        let total_count: usize = conn.query_row(
            "SELECT COUNT(*) FROM prompts_fts WHERE prompts_fts MATCH ?1",
            [&sanitized_query],
            |row| row.get::<_, i32>(0).map(|count| count as usize)
        ).unwrap_or(0);
        
        log::info!("Search found {} total results", total_count);
        
        // Get the actual search results with BM25 ranking
        let mut stmt = conn.prepare(
            r#"
            SELECT 
                v.prompt_uuid as uuid, 
                pf.title, 
                snippet(prompts_fts, 2, '<mark>', '</mark>', '...', 64) as snippet,
                bm25(prompts_fts) as rank
            FROM prompts_fts pf
            JOIN versions v ON v.uuid = pf.uuid
            WHERE prompts_fts MATCH ?1
            ORDER BY rank ASC
            LIMIT ?2 OFFSET ?3
            "#
        )?;
        
        let hits = stmt.query_map(
            [&sanitized_query, &search_limit.to_string(), &search_offset.to_string()],
            |row| {
                Ok(SearchHit {
                    uuid: row.get(0)?,
                    title: row.get(1)?,
                    snippet: row.get(2)?,
                    rank: row.get(3)?,
                })
            }
        )?
        .collect::<rusqlite::Result<Vec<_>>>()?;
        
        Ok(SearchResults {
            hits,
            total_count,
            query: query.clone(),
        })
    }).map_err(|e| e.to_string())?;
    
    Ok(results)
}

#[tauri::command]
pub async fn get_recent_prompts(limit: Option<usize>) -> std::result::Result<Vec<SearchHit>, String> {
    let db = get_database().map_err(|e| e.to_string())?;
    
    let search_limit = limit.unwrap_or(100).min(100);
    
    let results = db.with_connection(|conn| {
        let mut stmt = conn.prepare(
            r#"
            SELECT DISTINCT
                v.uuid,
                p.title,
                substr(v.body, 1, 200) as snippet,
                0.0 as rank
            FROM versions v
            JOIN prompts p ON p.uuid = v.prompt_uuid
            ORDER BY v.created_at DESC
            LIMIT ?1
            "#
        )?;
        
        let hits = stmt.query_map(
            [search_limit],
            |row| {
                Ok(SearchHit {
                    uuid: row.get(0)?,
                    title: row.get(1)?,
                    snippet: row.get(2)?,
                    rank: row.get(3)?,
                })
            }
        )?
        .collect::<rusqlite::Result<Vec<_>>>()?;
        
        Ok(hits)
    }).map_err(|e| e.to_string())?;
    
    Ok(results)
}