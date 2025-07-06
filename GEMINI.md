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
- **Frontend**: `src/` contains React application with TypeScript
- **Backend**: `src-tauri/src/` contains Rust code with Tauri commands
- **Database**: SQLite with FTS5 search in `src-tauri/src/db.rs`
- **Prompt Management**: Core business logic in `src-tauri/src/prompts.rs`

## Database Schema

Four main tables:
1. **prompts** - Core prompt metadata (uuid, title, tags, timestamps)
2. **versions** - Versioned content with semantic versioning (1.0.0, 1.0.1, etc.)
3. **runs** - Execution tracking with performance metrics (BLEU, ROUGE, costs)
4. **prompts_fts** - Full-text search virtual table

## Tauri Commands

Available Rust commands accessible from frontend:
- `greet(name: String)` - Basic greeting command
- Database and prompt management commands defined in `prompts.rs`

## Development Notes

### Tauri 2.0 Specifics
- Uses modern `app_handle.path()` API instead of deprecated v1 APIs
- Error handling: Rust errors converted to strings for Tauri interface
- Cross-platform path handling implemented

### Version Control System
- Semantic versioning for prompts with parent-child relationships
- Immutable version history
- Branching support for prompt variations

### Performance Tracking
- Comprehensive metrics: BLEU scores, ROUGE scores, judge scores
- Cost tracking: token counts and USD costs
- Run history with timestamps and metadata

## Configuration Files

- **`.cursorrules`** - Development guidelines and coding standards
- **`tauri.conf.json`** - Tauri app configuration
- **`vite.config.ts`** - Vite bundler with Tauri-specific settings
- **`tailwind.config.js`** - Tailwind CSS configuration