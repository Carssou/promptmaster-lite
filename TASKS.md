# PromptMaster-Lite: Prompt Discoverability Implementation Tasks

This document outlines all tasks needed to implement prompt discoverability features.

## 1. Metadata Sidebar

### 1.1 Frontend Components ✅ COMPLETED

- [x] **Create MetadataSidebar component** (`src/components/metadata/MetadataSidebar.tsx`)
  - Right-side overlay/docked panel in EditorScreen
  - Form fields: Title, Tags, Models, Category, Notes
  - Save/Cancel buttons with validation
- [x] **Create TagsInput component** (`src/components/metadata/TagsInput.tsx`)
  - Chip-based input with autocomplete
  - Case-insensitive, whitespace trimmed
  - Max 10 tags, 25 chars each
- [x] **Create ModelsMultiSelect component** (`src/components/metadata/ModelsMultiSelect.tsx`)
  - Multi-select dropdown reading from `model_providers` table
- [x] **Create CategoryPicker component** (`src/components/metadata/CategoryPicker.tsx`)
  - Tree path display with modal picker
  - Integration with Category Tree (see §3)
- [x] **Create NotesEditor component** (`src/components/metadata/NotesEditor.tsx`)
  - Markdown editor with preview
  - Tooltip rendering in list views

### 1.2 Backend Implementation ✅ COMPLETED

- [x] **Add metadata field to versions table**
  ```sql
  ALTER TABLE versions ADD COLUMN metadata TEXT; -- JSON blob
  ```
- [x] **Create metadata Tauri commands** (`src-tauri/src/metadata.rs`)
  - `metadata_update(version_uuid, payload_json)` - merge with existing JSON
  - `metadata_get(version_uuid)` - fetch metadata blob
  - `metadata_get_all_tags()` - get unique tags for autocomplete
  - `metadata_get_model_providers()` - get available AI models
- [x] **Update file writing logic** (`src-tauri/src/prompts.rs`)
  - Merge metadata into YAML frontmatter when writing .md files
  - Update DB columns: `title`, `tags`, `category_path`
  - Added `save_prompt_file_with_metadata()` function

### 1.3 Data Schema Updates ✅ COMPLETED

- [x] **Add metadata columns to prompts table**
  ```sql
  ALTER TABLE prompts ADD COLUMN category_path TEXT DEFAULT "Uncategorized";
  CREATE INDEX idx_category ON prompts(category_path);
  ```
- [x] **Create model_providers table**
  ```sql
  CREATE TABLE model_providers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    model_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    provider TEXT NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX idx_model_providers_active ON model_providers(active);
  CREATE INDEX idx_model_providers_provider ON model_providers(provider);
  ```
- [x] **Initialize default model providers**
  - Database-driven model selection in frontend

### 1.4 Extensibility ✅ COMPLETED

- [x] **Create metadata schema system** (`src/services/metadataSchema.ts`)
  - JSON schema registration for plugin fields
  - Dynamic form field generation
- [x] **Create DynamicFormField component** (`src/components/metadata/DynamicFormField.tsx`)
  - Supports all field types: string, number, boolean, array, select, multiselect, textarea, markdown, object
  - Field validation and dependency checking
  - Integration with existing metadata components
- [x] **Create DynamicMetadataSidebar component** (`src/components/metadata/DynamicMetadataSidebar.tsx`)
  - Automatically generates forms from registered schemas
  - Collapsible groups with validation summary
  - Plugin-extensible metadata editing interface

## 2. Full-Text Search (FTS5)

### 2.1 Database Schema

- [ ] **Create FTS5 virtual table** (`src-tauri/src/db.rs`)
  ```sql
  CREATE VIRTUAL TABLE prompts_fts USING fts5(
    uuid,
    title,
    body,
    tags,
    notes,
    content='versions',
    content_rowid='rowid'
  );
  ```
- [ ] **Create FTS sync triggers** (`src-tauri/src/db.rs`)
  - Trigger on versions INSERT/UPDATE/DELETE
  - Sync content to FTS table

### 2.2 Backend Search API

- [ ] **Create search module** (`src-tauri/src/search.rs`)
  - `search_prompts(query, limit, offset)` command
  - BM25 ranking with snippets
  - Query parser for phrases, prefixes, filters
- [ ] **Add search result types** (`src-tauri/src/search.rs`)
  ```rust
  pub struct SearchHit {
    pub uuid: String,
    pub title: String,
    pub snippet: String,
    pub rank: f64,
  }
  ```

### 2.3 Frontend Search Components

- [ ] **Create GlobalSearch component** (`src/components/search/GlobalSearch.tsx`)
  - Top navbar search bar
  - Keyboard shortcut: Cmd/Ctrl + F
  - Autocomplete with top 5 results
- [ ] **Create SearchResults component** (`src/components/search/SearchResults.tsx`)
  - Results list with title + snippet
  - Navigation to EditorScreen on selection
- [ ] **Add search query parser** (`src/services/searchParser.ts`)
  - Parse `tag:marketing`, `model:gpt-4`, phrase queries
  - Convert to FTS5 query syntax

## 3. Category Tree Navigation

### 3.1 Frontend Components

- [ ] **Create CategoryTree component** (`src/components/categories/CategoryTree.tsx`)
  - Collapsible tree structure
  - Count badges per node
  - Left sidebar placement below "Prompts"
- [ ] **Add drag & drop functionality** (`src/components/categories/CategoryTree.tsx`)
  - Drag prompts onto tree nodes
  - Update category_path on drop
- [ ] **Create category context menu** (`src/components/categories/CategoryTree.tsx`)
  - Right-click: rename, delete options
  - Delete moves prompts to parent category

### 3.2 Backend Category Management

- [ ] **Create categories module** (`src-tauri/src/categories.rs`)
  - `get_category_tree()` - build tree from category_path strings
  - `update_prompt_category(prompt_uuid, category_path)`
  - `rename_category(old_path, new_path)`
  - `delete_category(category_path)`

### 3.3 Category Tree Logic

- [ ] **Add category utilities** (`src/services/categoryUtils.ts`)
  - Parse `/`-delimited paths
  - Build tree structure from flat paths
  - Validate category names (printable ASCII only)

## 4. Quick Switcher (Cmd+P Style)

### 4.1 Frontend Components

- [ ] **Create QuickSwitcher component** (`src/components/switcher/QuickSwitcher.tsx`)
  - Modal overlay with keyboard shortcut: Cmd/Ctrl + P
  - Fuzzy search input field
  - Results list with arrow key navigation
- [ ] **Add fuzzy search logic** (`src/services/fuzzySearch.ts`)
  - Integration with `fuse.js` library
  - Search threshold: 0.4
  - Index: title, tags, uuid

### 4.2 Backend Support

- [ ] **Add quick search command** (`src-tauri/src/search.rs`)
  - `get_recent_prompts(limit)` - prefetch top 100 recent titles
  - Optimized for client-side fuzzy filtering

### 4.3 Navigation Integration

- [ ] **Add prompt navigation events** (`src/services/navigation.ts`)
  - `openPrompt(uuid)` event handling
  - Integration with React Router

## 5. Import Existing Prompts (Drag & Drop)

### 5.1 Frontend Drag & Drop

- [ ] **Create ImportDropZone component** (`src/components/import/ImportDropZone.tsx`)
  - Full-window drop target
  - File type validation and preview
- [ ] **Create ImportDialog component** (`src/components/import/ImportDialog.tsx`)
  - Progress indicator during import
  - Summary dialog with results
  - Duplicate handling options

### 5.2 Backend Import Processing

- [ ] **Create import module** (`src-tauri/src/import.rs`)
  - `import_files(file_paths)` command
  - Support for .md, .json, .txt formats
  - File size limit: 2MB default
- [ ] **Add file parsers** (`src-tauri/src/import.rs`)
  - Markdown with YAML frontmatter extraction
  - JSON schema validation for prompt arrays
  - Plain text with title prompting
- [ ] **Add duplicate detection** (`src-tauri/src/import.rs`)
  - Hash-based content comparison
  - User choice: skip or create new version

### 5.3 File Format Support

- [ ] **Define import schemas** (`src/types/import.ts`)
  - Prompt JSON schema validation
  - YAML frontmatter requirements
- [ ] **Add content sanitization** (`src/services/sanitizer.ts`)
  - XSS prevention for Markdown content
  - Path traversal protection

## 6. Test Suite of Example Prompts

### 6.1 Example Prompt Creation

- [ ] **Create examples directory** (`examples/`)
  - 10 sample prompts covering different use cases
  - Marketing, code generation, summarization, etc.
  - Each with proper tags, categories, example inputs
- [ ] **Add example prompt validation** (`tests/examples.test.ts`)
  - Unit tests for YAML schema compliance
  - Content quality checks

### 6.2 First Launch Integration

- [ ] **Create FirstLaunchWizard component** (`src/components/onboarding/FirstLaunchWizard.tsx`)
  - "Load example prompts?" checkbox
  - Welcome flow for new users
- [ ] **Add example loading logic** (`src-tauri/src/examples.rs`)
  - `load_example_prompts()` command
  - Copy files to user directory
  - Insert DB rows with proper UUIDs

## 7. Security & Privacy Implementation

### 7.1 Input Validation & Sanitization

- [ ] **Enhance security service** (`src/services/securityService.ts`)
  - Markdown XSS sanitization for drag & drop
  - Category name validation (printable ASCII only)
  - File size limits and type validation
- [ ] **Add SQL injection protection** (`src-tauri/src/search.rs`)
  - Parameterized FTS queries
  - Input validation for all search parameters

### 7.2 File System Security

- [ ] **Add path traversal protection** (`src-tauri/src/import.rs`)
  - Validate file paths during import
  - Restrict file access to user directory
- [ ] **Add content filtering** (`src-tauri/src/import.rs`)
  - Reject files >2MB by default
  - Content type validation

## 8. Extensibility Hooks Implementation

### 8.1 Plugin System Extensions

- [ ] **Extend hooks manager** (`src/services/hooks.ts`)
  - `onPromptImported(prompt, source)` event
  - Search provider interface registration
  - Category panel context menu hooks
- [ ] **Create search provider interface** (`src/services/searchProviders.ts`)
  - Abstract search provider class
  - Plugin registration system for external search (Algolia, Azure)

### 8.2 Plugin API Documentation

- [ ] **Document plugin interfaces** (`docs/plugins.md`)
  - Search provider implementation guide
  - Category panel extension examples
  - Import pipeline hook usage

## 9. Testing & Quality Assurance

### 9.1 Unit Tests

- [ ] **Test metadata operations** (`src/services/__tests__/metadata.test.ts`)
- [ ] **Test search functionality** (`src/services/__tests__/search.test.ts`)
- [ ] **Test category utilities** (`src/services/__tests__/categories.test.ts`)
- [ ] **Test import parsers** (`src-tauri/src/tests/import.rs`)

### 9.2 Integration Tests

- [ ] **Test FTS5 integration** (`tests/integration/search.test.ts`)
- [ ] **Test drag & drop workflow** (`tests/integration/import.test.ts`)
- [ ] **Test category tree operations** (`tests/integration/categories.test.ts`)

### 9.3 E2E Tests

- [ ] **Test search workflows** (`tests/e2e/search.spec.ts`)
- [ ] **Test import workflows** (`tests/e2e/import.spec.ts`)
- [ ] **Test category management** (`tests/e2e/categories.spec.ts`)

## 10. Documentation & User Experience

### 10.1 User Documentation

- [ ] **Update README.md** with new features
- [ ] **Create user guide** (`docs/user-guide.md`)
  - Search tips and tricks
  - Category organization best practices
  - Import workflow documentation

### 10.2 Developer Documentation

- [ ] **Document database schema changes** (`docs/database-schema.md`)
- [ ] **Create API documentation** (`docs/api.md`)

## Implementation Priority

### Phase 1: Core Infrastructure

1. Database schema updates (FTS5, metadata columns)
2. Basic search backend implementation
3. Metadata sidebar frontend components

### Phase 2: Search & Navigation

1. Full-text search frontend integration
2. Category tree implementation
3. Quick switcher component

### Phase 3: Import & Examples

1. Drag & drop import system
2. Example prompts integration
3. First launch wizard

### Phase 4: Polish & Testing

1. Security hardening
2. Comprehensive test suite
3. Documentation updates
4. Extensibility hooks

## Dependencies to Add

```json
{
  "fuse.js": "^7.0.0",
  "react-dnd": "^16.0.1",
  "react-dnd-html5-backend": "^16.0.1",
  "js-yaml": "^4.1.0"
}
```

```toml
[dependencies]
# Add to src-tauri/Cargo.toml
yaml-rust = "0.4"
sha2 = "0.10"
```

---

**Total Estimated Tasks: ~85 individual tasks across 10 major feature areas**

This comprehensive task list covers all requirements from the prompt discoverability specification, organized by feature area with clear implementation priorities.
