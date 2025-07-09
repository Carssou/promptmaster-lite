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

### Variable System
- **Automatic Detection**: Scans content for `{{variable_name}}` patterns using regex
- **Simplified Hierarchy**: User defined values → fallback tokens `«var»` (no YAML frontmatter)
- **Real-time Validation**: Detects unclosed braces, nested braces, invalid names
- **Security**: API key detection and removal (`sk-\w{48}` patterns)

### Performance Optimizations (v0.4.0)
- **Keystroke Latency**: <50ms with debouncing (300ms) and memoization
- **Memory Usage**: Map-based caching for variable parsing and security validation
- **Virtual Scrolling**: Implemented for large version lists (20+ items)
- **Loading States**: Skeleton screens for all major components

## Available Tauri Commands

### Prompt Management
- `save_prompt(title, content, tags, app_handle)` - Save new prompt with validation
- `list_prompts(app_handle)` - Get all prompts from database

### Version Management
- `get_latest_version(prompt_uuid)` - Returns latest version content
- `save_new_version(prompt_uuid, body, app_handle)` - Creates new version with auto-bump
- `list_versions(prompt_uuid)` - Lists all versions ordered by creation time
- `get_version_by_uuid(version_uuid)` - Retrieves specific version
- `rollback_to_version(version_uuid, app_handle)` - Creates new version with old content

All commands include input validation, proper error handling, database transactions, and structured logging.

## Database Schema

Four main tables:
1. **prompts** - Core prompt metadata (uuid, title, tags, timestamps)
2. **versions** - Versioned content with semantic versioning
3. **runs** - Schema ready for performance metrics (not yet implemented)
4. **prompts_fts** - Full-text search virtual table (not yet implemented)

## Error Handling & Logging
- Custom `AppError` type with proper error propagation
- Structured logging with `env_logger` (set `RUST_LOG=debug` for details)
- Input validation for all user inputs
- Database transactions ensure data consistency

## Production Status (v0.4.0)

### ✅ COMPLETED FEATURES
- **Monaco Editor**: Full markdown editing with syntax highlighting
- **Version Management**: Auto-incrementing versions with rollback
- **Variable System**: Real-time `{{variable}}` detection and substitution
- **Live Preview**: Markdown rendering with variable substitution
- **Diff Viewer**: Auto-diff with Cmd+D comparing versions
- **File System Sync**: Automatic .md file generation
- **Keyboard Shortcuts**: Complete hotkey system with help modal (Cmd+?)
- **Security Hardening**: Input validation, content sanitization, logging
- **Performance**: <50ms keystroke latency, virtual scrolling, skeleton loading

### 🔧 BUILD NOTES
- Both frontend and backend compile successfully
- All 7 Tauri commands working with real database
- Cross-platform support (Windows, macOS, Linux)

### 🚧 PENDING TASKS
- **Accessibility**: ARIA roles, keyboard navigation, screen reader support
- **File Watcher**: Delete event handling (recreate files from database)
- **Testing**: Unit tests for variable parser, E2E tests for core flows

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