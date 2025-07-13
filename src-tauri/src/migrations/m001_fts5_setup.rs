use rusqlite::Connection;
use crate::error::Result;

pub fn run(conn: &Connection) -> Result<()> {
    log::info!("Running migration 1: FTS5 setup");
    
    // Drop old FTS table if exists
    conn.execute("DROP TABLE IF EXISTS prompts_fts", [])?;
    
    // Create new FTS5 table without external content (simpler approach)
    conn.execute_batch(
        r#"
        CREATE VIRTUAL TABLE IF NOT EXISTS prompts_fts USING fts5(
            uuid, title, body, tags, notes
        );
        "#,
    )?;
    
    // Check how many versions exist first
    let version_count: i32 = conn.query_row(
        "SELECT COUNT(*) FROM versions",
        [],
        |row| row.get(0)
    ).unwrap_or(0);
    
    log::info!("Found {} versions in database", version_count);
    
    // Populate with existing data
    let populated_rows = conn.execute(
        r#"
        INSERT INTO prompts_fts(uuid, title, body, tags, notes)
        SELECT v.uuid, p.title, v.body, 
               REPLACE(REPLACE(REPLACE(COALESCE(p.tags, ''), '[', ''), ']', ''), '"', ''),
               COALESCE(json_extract(v.metadata, '$.notes'), '')
        FROM versions v JOIN prompts p ON p.uuid = v.prompt_uuid;
        "#,
        [],
    ).unwrap_or_else(|e| {
        log::warn!("Failed to populate FTS table: {}. Expected for new databases.", e);
        0
    });
    
    log::info!("Populated FTS table with {} rows out of {} versions", populated_rows, version_count);
    
    // Verify FTS table has data
    let fts_count: i32 = conn.query_row(
        "SELECT COUNT(*) FROM prompts_fts",
        [],
        |row| row.get(0)
    ).unwrap_or(0);
    
    log::info!("FTS table now contains {} entries", fts_count);
    log::info!("Migration 1 completed successfully");
    Ok(())
}