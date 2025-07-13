# Database Migrations

This directory contains all database schema migrations for PromptMaster-Lite.

## How It Works

1. **Migration Runner** (`../migrations.rs`) - Checks current schema version and runs pending migrations
2. **Individual Migrations** (`m001_*.rs`, `m002_*.rs`, etc.) - Self-contained migration files

## Adding a New Migration

### Step 1: Create Migration File
```bash
# Create new migration file with descriptive name
touch src-tauri/src/migrations/m002_add_category_indexes.rs
```

### Step 2: Implement Migration
```rust
// src-tauri/src/migrations/m002_add_category_indexes.rs
use rusqlite::Connection;
use crate::error::Result;

pub fn run(conn: &Connection) -> Result<()> {
    log::info!("Running migration 2: Add category indexes");
    
    conn.execute_batch(
        r#"
        CREATE INDEX IF NOT EXISTS idx_prompts_category_path 
        ON prompts(category_path);
        
        CREATE INDEX IF NOT EXISTS idx_prompts_created_at 
        ON prompts(created_at);
        "#,
    )?;
    
    log::info!("Migration 2 completed successfully");
    Ok(())
}
```

### Step 3: Register Migration
Add to `../migrations.rs`:
```rust
mod m002_add_category_indexes;

// In run_migrations():
if current_version < 2 {
    m002_add_category_indexes::run(conn)?;
    conn.execute("INSERT OR REPLACE INTO schema_version (version) VALUES (2)", [])?;
}
```

## Migration Guidelines

### ✅ DO
- **One purpose per migration** - Each migration should do one logical thing
- **Use descriptive names** - `m003_add_fts_triggers.rs` not `m003_misc.rs`
- **Include logging** - Start and end messages for debugging
- **Handle failures gracefully** - Use `IF NOT EXISTS` for tables/indexes
- **Test thoroughly** - Both on new and existing databases

### ❌ DON'T
- **Don't modify existing migrations** - Once released, migrations are immutable
- **Don't skip version numbers** - Always increment sequentially
- **Don't combine unrelated changes** - Keep migrations focused
- **Don't forget to register** - Always add to the main migrations.rs

## Migration Naming Convention

```
m{VERSION}_{DESCRIPTION}.rs

Examples:
- m001_fts5_setup.rs
- m002_add_category_indexes.rs  
- m003_create_search_cache.rs
- m004_add_user_preferences.rs
```

## Testing Migrations

### Test on New Database
```bash
# Delete existing database
rm ~/Documents/PromptMaster/promptmaster.db

# Run app - should create fresh DB with all migrations
npm run tauri dev
```

### Test on Existing Database
```bash
# Keep existing database, run migrations
npm run tauri dev

# Check logs for migration messages
tail -f logs/app.log
```

## Schema Versioning

The `schema_version` table tracks applied migrations:
```sql
CREATE TABLE schema_version (
    version INTEGER PRIMARY KEY
);
```

Current version is: `SELECT MAX(version) FROM schema_version`

## Rollback Strategy

**Migrations are forward-only.** If you need to undo something:
1. Create a new migration that reverses the change
2. Never modify existing migration files
3. For development, you can delete the database and start fresh

## File Structure

```
src-tauri/src/migrations/
├── README.md                    # This file
├── m001_fts5_setup.rs          # Migration 1: FTS5 table setup
├── m002_add_category_indexes.rs # Migration 2: Category performance  
├── m003_create_search_cache.rs  # Migration 3: Search optimization
└── ...                         # Future migrations
```

## Common Migration Patterns

### Adding Tables
```rust
conn.execute_batch(
    r#"
    CREATE TABLE IF NOT EXISTS new_table (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL
    );
    
    CREATE INDEX IF NOT EXISTS idx_new_table_name 
    ON new_table(name);
    "#,
)?;
```

### Adding Columns
```rust
// SQLite doesn't support IF NOT EXISTS for ALTER TABLE
// Check if column exists first
let column_exists: bool = conn.query_row(
    "SELECT COUNT(*) FROM pragma_table_info('prompts') WHERE name='new_column'",
    [],
    |row| row.get::<_, i32>(0).map(|count| count > 0)
).unwrap_or(false);

if !column_exists {
    conn.execute("ALTER TABLE prompts ADD COLUMN new_column TEXT", [])?;
}
```

### Migrating Data
```rust
// Update existing records
conn.execute(
    "UPDATE prompts SET category_path = 'Uncategorized' WHERE category_path IS NULL",
    [],
)?;

// Populate new table from existing data
conn.execute(
    r#"
    INSERT INTO new_table (name, data)
    SELECT title, metadata FROM prompts WHERE metadata IS NOT NULL
    "#,
    [],
)?;
```

## Troubleshooting

### Migration Fails
1. Check logs for specific error
2. Ensure migration is idempotent (can run multiple times)
3. Test migration in isolation
4. Verify SQL syntax

### Version Conflicts
```bash
# Check current version
sqlite3 ~/Documents/PromptMaster/promptmaster.db "SELECT * FROM schema_version;"

# Manually set version (development only)
sqlite3 ~/Documents/PromptMaster/promptmaster.db "UPDATE schema_version SET version = 0;"
```

### Performance Issues
- Run `ANALYZE` after creating indexes
- Use `EXPLAIN QUERY PLAN` to verify index usage
- Monitor migration time in logs