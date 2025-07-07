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
- `save_prompt(title, content, tags, app_handle)` - Save new prompt with validation and transactions
- `list_prompts(app_handle)` - Get all prompts from database with error handling

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
- Automatic frontmatter parsing with robust error handling
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
- Keyboard shortcuts: `Cmd+S` (save), `Cmd+D` (diff), `Esc` (exit), `Cmd+N` (new prompt)
- Resizable panels with professional 3-panel layout

### Variable System
- **Automatic Detection**: Scans content for `{{variable_name}}` patterns using regex
- **Substitution Hierarchy**: Manual overrides → YAML frontmatter → fallback tokens `«var»`
- **Real-time Validation**: Detects unclosed braces, nested braces, invalid names
- **Live Preview**: Variables are substituted in markdown preview
- **Security**: API key detection and removal (`sk-\w{48}` patterns)
- **Sources**: Variables tagged as Manual, YAML, or Undefined in sidebar

### Future Features (Database Schema Ready)
- Performance tracking: BLEU scores, ROUGE scores, judge scores
- Cost tracking: token counts and USD costs  
- Full-text search with FTS5

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