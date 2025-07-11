# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PromptMaster-Lite is a local-first desktop application for managing AI prompts, built with Tauri 2.0 (Rust backend) and React (TypeScript frontend). The application provides prompt creation, versioning, and organization with dual storage (SQLite + markdown files).

## Development Commands

```bash
# Start development with hot reload
npm run tauri dev

# Build production executable
npm run tauri build

# Start frontend only (for UI development)
npm run dev

# Build frontend for production
npm run build

# Testing commands
npm run test                    # Unit tests (Jest) - 18 tests
npm run test:integration        # Integration tests (Vitest) - 19 tests
npm run test:e2e               # E2E tests (Playwright)
npm run test:all               # Run all test suites
```

## Key Architecture Notes

### Local-First Design

- **Dual Storage**: SQLite database for structured data + markdown files for human-readable backups
- **No Cloud Dependencies**: Everything runs locally with cross-platform file system integration
- **File Naming Convention**: `YYYY-MM-DD--title-slug--v1.0.0.md`

### Tech Stack

- **Frontend**: React 18.3.1 + TypeScript + Vite 6.0.3
- **Backend**: Rust (Tauri 2.0) + SQLite
- **Styling**: Tailwind CSS 3.4.17
- **State Management**: Zustand 5.0.6

### Database Operations

- **Location**: `~/Documents/PromptMaster/promptmaster.db`
- **Version Ordering**: Uses `ORDER BY created_at DESC` (not complex semver parsing)
- **Null Safety**: All prompt operations include proper null checks (`prompt?.version`)

## Development Context

### Tauri 2.0 Specifics

- Uses modern `app_handle.path()` API instead of deprecated v1 APIs
- Error handling: Rust errors converted to strings for Tauri interface
- Cross-platform path handling implemented

### Version Control System

- Semantic versioning for prompts with parent-child relationships
- Immutable version history (1.0.0 → 1.0.1 → 1.0.2)
- Rollback creates new version with old content (non-destructive)

### File Watcher

- Selective monitoring of `.md` files only (ignores database/temp files)
- Debounced file changes (500ms) to prevent rapid-fire updates
- Thread-safe operation with proper resource management
- **Delete Event Handling**: Automatically recreates deleted .md files from database (database as source of truth)

### Variable System

- **Automatic Detection**: Scans content for `{{variable_name}}` patterns using regex
- **Simplified Hierarchy**: User defined values → fallback tokens `«var»` (no YAML frontmatter)
- **Real-time Validation**: Detects unclosed braces, nested braces, invalid names
- **Security**: API key detection and removal (`sk-\w{48}` patterns)
- **Variable Name Rules**: Must start with letter/underscore, contain only `[a-zA-Z0-9_]`

### Extensibility System

- **Hooks Manager**: `src/services/hooks.ts` - Simple plugin system
- **Available Hooks**:
  - `onSave(content, promptUuid)` - Called when prompt is saved
  - `onContentChange(content, promptUuid)` - Called on editor changes
  - `onVersionCreated(version, promptUuid)` - Called when new version created
  - `getEditorMarkers(content)` - Provides Monaco editor markers for validation
- **Usage**: `hooks.register({ onSave: (content, uuid) => console.log('Saved!') })`
- **Dynamic Metadata System**: `src/services/metadataSchema.ts` - JSON schema registration for plugin fields
- **Dynamic Form Fields**: `src/components/metadata/DynamicFormField.tsx` - Supports all field types with validation
- **Dynamic Metadata Sidebar**: `src/components/metadata/DynamicMetadataSidebar.tsx` - Plugin-extensible metadata editing

### Performance Optimizations (v0.5.0)

- **Keystroke Latency**: <50ms with debouncing (300ms) and memoization
- **Memory Usage**: Map-based caching for variable parsing and security validation (12x speed improvement)
- **Virtual Scrolling**: Implemented for large version lists (20+ items)
- **Loading States**: Skeleton screens for all major components
- **Variable Processing**: Handles 100+ variables in <1ms, 1000 different contents in ~2ms

## Available Tauri Commands

### Prompt Management

- `save_prompt(title, content, tags, app_handle)` - Save new prompt with validation
- `list_prompts(app_handle)` - Get all prompts from database

### Version Management

- `get_latest_version(prompt_uuid)` - Returns latest version content
- `save_new_version(prompt_uuid, body, app_handle)` - Creates new version with auto-bump
- `list_versions(prompt_uuid)` - Lists all versions ordered by creation time
- `list_versions_full(prompt_uuid)` - Complete version data with content (for diff/rollback)
- `get_version_by_uuid(version_uuid)` - Retrieves specific version
- `rollback_to_version(version_uuid, app_handle)` - Creates new version with old content

### Metadata Management

- `metadata_get(version_uuid)` - Fetch metadata for a specific version
- `metadata_update(version_uuid, payload_json)` - Update metadata with merge functionality and prompts table sync
- `metadata_get_all_tags()` - Get unique tags for autocomplete
- `metadata_get_model_providers()` - Get available AI models from database
- `metadata_add_model_provider(model_id, name, provider)` - Add new AI model
- `metadata_remove_model_provider(model_id)` - Remove AI model
- `regenerate_markdown_file(app_handle, prompt_uuid)` - Regenerate .md file with updated metadata

### File System

- `recreate_prompt_file(app_handle, deleted_file_path)` - Recreates deleted .md files from database

All commands include input validation, proper error handling, database transactions, and structured logging.

## Database Schema

Five main tables:

1. **prompts** - Core prompt metadata (uuid, title, tags, category_path, timestamps)
2. **versions** - Versioned content with semantic versioning + metadata JSON blob
3. **model_providers** - User-managed AI model definitions (no hardcoded models)
4. **runs** - Schema ready for performance metrics (not yet implemented)
5. **prompts_fts** - Full-text search virtual table (not yet implemented)

### Metadata System

- **JSON Storage**: Rich metadata stored in `versions.metadata` column
- **User-Managed Models**: No hardcoded AI models, users add their own current models
- **Category Organization**: Hierarchical categories via `category_path` column
- **Tag Autocomplete**: Extracted from existing prompts for smart suggestions
- **YAML Integration**: Metadata automatically merged into .md file frontmatter
- **Data Synchronization**: Metadata changes automatically sync to prompts table (title, tags, category_path)
- **Markdown Generation**: Full markdown file regeneration with updated frontmatter (including models field)
- **Scrollable UI**: Dynamic metadata sidebar with proper scrolling for accessibility

## Error Handling & Logging

- Custom `AppError` type with proper error propagation
- Structured logging with `env_logger` (set `RUST_LOG=debug` for details)
- Input validation for all user inputs
- Database transactions ensure data consistency

## Production Status (v0.5.0)

### ✅ COMPLETED FEATURES

- **Monaco Editor**: Full markdown editing with syntax highlighting
- **Version Management**: Auto-incrementing versions with rollback
- **Variable System**: Real-time `{{variable}}` detection and substitution
- **Live Preview**: Markdown rendering with variable substitution
- **Diff Viewer**: Auto-diff with Cmd+D comparing versions
- **File System Sync**: Automatic .md file generation + delete event recovery
- **Keyboard Shortcuts**: Complete hotkey system with help modal (Cmd+?)
- **Security Hardening**: Input validation, content sanitization, logging
- **Performance**: <50ms keystroke latency, virtual scrolling, skeleton loading
- **Accessibility**: WCAG compliant with ARIA roles, keyboard navigation, screen reader support
- **Extensibility**: Basic hooks system for plugin support (Monaco markers, onSave callbacks)

### 🔧 BUILD NOTES

- Both frontend and backend compile successfully
- All 8 Tauri commands working with real database (including regenerate_markdown_file)
- Cross-platform support (Windows, macOS, Linux)
- Comprehensive test suite: 37 total tests (18 unit + 19 integration)
- **Metadata System**: Fully functional with database synchronization and markdown file updates

### ✅ ALL TASKS COMPLETED (2025-07-10)

**Production Ready**: All core features, accessibility, testing, and extensibility complete

#### Task 1.4 - Extensibility System ✅ COMPLETED

- **Metadata Schema System**: Complete JSON schema registration system for plugin fields (`src/services/metadataSchema.ts`)
- **Dynamic Form Generation**: Comprehensive `DynamicFormField` component supporting all field types (string, number, boolean, array, select, multiselect, textarea, markdown, object)
- **Plugin Architecture**: Full extensibility hooks with validation, dependency checking, and form rendering
- **Schema Registry**: Global registry with schema compilation, field merging, and conflict detection
- **Core Schema**: Built-in metadata fields (title, tags, categoryPath, models, notes) with validation
- **Dynamic Sidebar**: `DynamicMetadataSidebar` component that automatically generates forms from registered schemas

### 🔌 Extensibility System (v0.5.0)

- **Metadata Schema System**: Complete JSON schema registration system for plugin fields
- **Dynamic Form Generation**: Automatic UI generation from metadata schemas with validation
- **Plugin Field Types**: Support for string, number, boolean, array, select, multiselect, textarea, markdown, object
- **Field Dependencies**: Conditional field visibility based on other field values
- **Group Organization**: Collapsible field groups with custom ordering and icons
- **Validation Framework**: Built-in and custom validation with real-time error reporting
- **Hooks Integration**: Schema registration/unregistration hooks for plugin lifecycle management
- **Core Schema**: Pre-built schema for title, tags, category, models, and notes fields
- **Test Coverage**: Comprehensive unit tests for all schema functionality

## Common Issues & Solutions

### Build Issues

- Run `cargo clean` for `rlib` format errors
- Ensure all dependencies are properly linked
- Check platform-specific requirements (webkit2gtk on Linux)

### Performance Issues

- Editor optimized for <50ms keystroke latency
- Uses debouncing (300ms) and memoization for heavy operations
- Virtual scrolling kicks in for version lists >20 items

### Database Issues

- Database created automatically on first run
- Connection pooling prevents lock contention
- File watcher handles external .md file changes

## Important Development Notes

- **Database as Source of Truth**: SQLite is primary, .md files are backup
- **No Frontmatter Complexity**: Variables use simple `{{variable}}` syntax
- **IPC Integration**: All operations use real backend calls, no mock data
- **Error Recovery**: Graceful fallbacks for missing data
- **Security**: All entry points use same validation system

## Testing Strategy

### Unit Tests (Jest)

- **Location**: `src/services/__tests__/`
- **Focus**: Variable parser functions (18 tests)
- **Coverage**: parseVariables, substituteVariables, validateVariableUsage
- **Performance**: All tests complete in <1s

### Integration Tests (Vitest)

- **Location**: `tests/integration/`
- **Focus**: Component interactions and performance (19 tests)
- **Key Tests**:
  - `variable-workflow.test.tsx`: Real component state management
  - `performance.test.ts`: Timing benchmarks and memory pressure
- **No Heavy Mocking**: Tests real business logic with minimal mocks

### E2E Tests (Playwright)

- **Location**: `tests/e2e/`
- **Focus**: Complete user workflows
- **Coverage**: Edit→Save→Diff, Variable substitution, Version history
- **Multi-Browser**: Chrome, Firefox, Safari

### Test Data Attributes

- Use `data-testid` for reliable element selection
- Consistent naming: `data-testid="component-action-target"`
- Examples: `prompt-editor`, `variable-input-name`, `version-item-v1.0.0`

## Development Standards

**⚠️ CRITICAL**: Always check `.cursorrules` before writing code. This file contains comprehensive development guidelines including:

- Complete code requirements (always provide full, working files)
- Tauri 2.0 API usage patterns
- Database operation best practices
- TypeScript/React standards
- Error handling patterns
- File organization conventions
- Testing approaches

The rules in `.cursorrules` are mandatory for maintaining code quality and consistency across the project.
