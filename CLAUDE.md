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
```

## Architecture

### Local-First Design
- **Dual Storage**: SQLite database for structured data + markdown files for human-readable backups
- **No Cloud Dependencies**: Everything runs locally with cross-platform file system integration
- **File Naming Convention**: `YYYY-MM-DD--title-slug--v1.0.0.md`

### Tech Stack
- **Frontend**: React 18.3.1 + TypeScript + Vite 6.0.3
- **Backend**: Rust (Tauri 2.0) + SQLite
- **Styling**: Tailwind CSS 3.4.17
- **State Management**: Zustand 5.0.6

### Key Components

#### Frontend Architecture
- **EditorScreen**: Main editing interface at `src/pages/EditorScreen.tsx`
- **PromptEditor**: Monaco Editor wrapper at `src/components/editor/PromptEditor.tsx`
- **LivePreview**: Markdown renderer at `src/components/editor/LivePreview.tsx`
- **PromptDiff**: Monaco Diff Viewer at `src/components/editor/PromptDiff.tsx`
- **VersionHistory**: Version sidebar at `src/components/version/VersionHistory.tsx`
- **VariablePanel**: Variable management at `src/components/variables/VariablePanel.tsx`
- **Variable Parser**: Core engine at `src/services/variableParser.ts`

#### Backend Components
- **Database Manager**: Thread-safe connection pooling in `src-tauri/src/database.rs`
- **Database Layer**: Singleton management in `src-tauri/src/db.rs`
- **Prompt Management**: Core business logic in `src-tauri/src/prompts.rs`
- **Version Management**: Auto-versioning system in `src-tauri/src/versions.rs`
- **File Watcher**: Selective .md file monitoring in `src-tauri/src/watcher.rs`
- **Error Handling**: Custom error types in `src-tauri/src/error.rs`

## Database Schema

Four main tables:
1. **prompts** - Core prompt metadata (uuid, title, tags, timestamps)
2. **versions** - Versioned content with semantic versioning (1.0.0, 1.0.1, etc.)
3. **runs** - Schema ready for performance metrics (BLEU, ROUGE, costs) - not yet implemented
4. **prompts_fts** - Full-text search virtual table - not yet implemented

## Tauri Commands

Available Rust commands accessible from frontend:

### Prompt Management
- `save_prompt(title, content, tags, app_handle)` - Save new prompt with validation and transactions
- `list_prompts(app_handle)` - Get all prompts from database with error handling

### Version Management
- `get_latest_version(prompt_uuid)` - Returns latest version content for a prompt  
- `save_new_version(prompt_uuid, body, app_handle)` - Creates new version with auto-bump (1.0.0 → 1.0.1)
- `list_versions(prompt_uuid)` - Lists all versions for a prompt ordered by creation time
- `get_version_by_uuid(version_uuid)` - Retrieves specific version by UUID
- `rollback_to_version(version_uuid, app_handle)` - Creates new version with old content (rollback)

All commands include:
- Input validation and sanitization
- Proper error handling with custom error types  
- Database transactions for consistency
- Structured logging for debugging

## Development Notes

### Tauri 2.0 Specifics
- Uses modern `app_handle.path()` API instead of deprecated v1 APIs
- Error handling: Rust errors converted to strings for Tauri interface
- Cross-platform path handling implemented

### Version Control System
- Semantic versioning for prompts with parent-child relationships
- Immutable version history
- Branching support for prompt variations

### File Watcher
- Selective monitoring of `.md` files only (ignores database/temp files)
- Debounced file changes (500ms) to prevent rapid-fire updates
- ~~Automatic frontmatter parsing~~ → Simplified content-only monitoring
- Thread-safe operation with proper resource management

### Error Handling & Logging
- Custom `AppError` type with proper error propagation
- Structured logging with `env_logger` (set `RUST_LOG=debug` for details)
- Input validation for all user inputs (title length, content size, tag limits)
- Database transactions ensure data consistency

### Database Architecture
- Singleton database manager with connection pooling
- Thread-safe access with proper locking mechanisms
- Automatic schema creation on first run
- Transaction support for multi-operation consistency

### Frontend Robustness
- Debounced file watcher events to prevent toast spam
- Silent reloads for background file changes
- Loading states and proper error feedback
- Monaco Editor with syntax highlighting and error markers
- Live preview with variable substitution and API key stripping
- High-contrast diff viewer with color-blind friendly theme
- Keyboard shortcuts: `Cmd+S` (save), `Cmd+D` (auto-diff current vs previous), `Esc` (exit diff), `Cmd+N` (new prompt)
- Resizable panels with professional 3-panel layout

### Variable System (UPDATED)
- **Automatic Detection**: Scans content for `{{variable_name}}` patterns using regex
- **Simplified Hierarchy**: User defined values → fallback tokens `«var»` (YAML frontmatter removed for better UX)
- **Real-time Validation**: Detects unclosed braces, nested braces, invalid names
- **Live Preview**: Variables are substituted in markdown preview with real-time updates
- **Security**: API key detection and removal (`sk-\w{48}` patterns)
- **Clean UI**: Variables tagged as "Defined" (blue) or "Undefined" (red) - no complex source tracking
- **No Frontmatter Complexity**: Removed YAML parsing to prevent user errors and corruption

### Future Features (Database Schema Ready)
- Performance tracking: BLEU scores, ROUGE scores, judge scores
- Cost tracking: token counts and USD costs  
- Full-text search with FTS5

## Production Status (2025-07-08 - v0.3.0)

### ✅ COMPLETED & WORKING
- **Monaco Editor**: Full markdown editing with syntax highlighting
- **Version Management**: Auto-incrementing versions (1.0.0 → 1.0.1 → 1.0.2)
- **Version History**: Real-time version sidebar with rollback functionality
- **Rollback System**: Creates new versions with old content (non-destructive)
- **Database Integration**: Real SQLite operations, no mock data
- **Variable System**: Real-time `{{variable}}` detection and substitution
- **Live Preview**: Markdown rendering with variable substitution
- **Diff Viewer**: Auto-diff with Cmd+D comparing current vs previous version
- **File System Sync**: Automatic .md file generation with proper tag preservation
- **Error Handling**: Comprehensive null checks and graceful fallbacks
- **Performance**: Optimized SQL queries, debounced operations

### 🐛 CRITICAL BUGS FIXED (v0.3.0)
- **SQLite Query Error**: Fixed `reverse()` function issue in version ordering
- **Version Display Bug**: Now shows actual current version instead of always "v1.0.0"
- **Content Loading**: Loads real prompt content instead of "# New Prompt" placeholder
- **Null Reference Errors**: Added proper `prompt?.version` safety checks
- **Mock Data Pollution**: Removed hardcoded test variables
- **Duplicate Versions**: Fixed race conditions in version bump logic
- **Tags Not Preserved**: Fixed tuple indexing bug in `sync_version_to_file`
- **File Watcher Conflicts**: Added existence check to prevent duplicate creation
- **Blocked Confirmation Dialogs**: Replaced native `confirm()` with React modals
- **Database Constraints**: Added unique constraints on `(prompt_uuid, semver)`

### 🎯 READY FOR USE
**Phase 1, 2 & 3**: Production-ready for complete prompt editing, versioning, history, and rollback

### 🔧 IMPORTANT NOTES FOR DEVELOPERS
- **Database Location**: `~/Documents/PromptMaster/promptmaster.db`
- **Version Ordering**: Uses `ORDER BY created_at DESC` (not complex semver parsing)
- **Variable Detection**: No frontmatter required - just use `{{variable_name}}` in content
- **Null Safety**: All prompt operations include proper null checks (`prompt?.version`)
- **IPC Integration**: All 7 Tauri commands working with real database (including rollback)
- **Build Status**: Both frontend and backend compile successfully

## Robustness Features

### Production Ready Architecture
- No duplicate entry points (consolidated to `main.rs`)
- Proper resource cleanup and shutdown handling
- Comprehensive error boundaries and recovery
- Input sanitization to prevent injection attacks

### Performance Optimizations
- Connection pooling prevents database lock contention
- Debounced file watching reduces CPU overhead
- Selective file monitoring (only `.md` files)
- Efficient regex compilation with `lazy_static`

### Development Experience
- Structured logging for debugging (`RUST_LOG=debug`)
- Clear error messages with context
- Automatic database schema migrations
- Hot reload support with file watcher integration

### Common Build Issues
- Run `cargo clean` for `rlib` format errors
- Ensure all dependencies are properly linked
- Check platform-specific requirements (webkit2gtk on Linux)

## Configuration Files

- **`.cursorrules`** - Development guidelines and coding standards
- **`tauri.conf.json`** - Tauri app configuration
- **`vite.config.ts`** - Vite bundler with Tauri-specific settings
- **`tailwind.config.js`** - Tailwind CSS configuration