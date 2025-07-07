# PromptMaster Lite

A local-first desktop application for managing AI prompts with versioning, search, and performance tracking.

![PromptMaster Lite](https://img.shields.io/badge/version-0.1.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey.svg)

## Features

### Core Editing Experience
- 🖥️ **Monaco Editor** - Professional code editor with syntax highlighting for markdown and YAML
- 👁️ **Live Preview** - Real-time markdown rendering with variable substitution
- 🔧 **Variable Management** - Automatic `{{variable}}` detection with sidebar panel
- 📊 **Version Diff Viewer** - Side-by-side comparison with Monaco Diff Editor
- ⌨️ **Keyboard Shortcuts** - Cmd+S (save), Cmd+D (diff), Esc (exit modes)
- 📐 **Resizable Panels** - 3-panel layout (history, editor/preview, variables)

### Data Management
- 🗂️ **Local-first prompt management** - All data stored locally in your Documents folder
- 📝 **Dual storage** - SQLite database + human-readable markdown files
- 🔄 **File watcher** - Automatic sync when you edit files externally
- 🏷️ **Tag-based organization**
- ⚡ **Semantic versioning** for prompts (1.0.0, 1.1.0, 2.0.0)

### Planned Features
- 🔍 **Full-text search** with SQLite FTS5 (database schema ready)
- 📊 **Performance tracking** - BLEU, ROUGE, and custom metrics (database schema ready)
- 💰 **Cost tracking** - Token counts and USD costs (database schema ready)

## Setup Instructions

### Prerequisites

- **Node.js** 18+ 
- **Rust** (latest stable)
- **Platform-specific requirements:**
  - **macOS**: Xcode Command Line Tools
  - **Linux**: `webkit2gtk`, `libappindicator3`, `librsvg2`, `patchelf`
  - **Windows**: Visual Studio Build Tools

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd promptmaster-lite
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run in development mode**
   ```bash
   npm run tauri dev
   ```

4. **Build for production**
   ```bash
   npm run tauri build
   ```

### Linux Dependencies

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y libwebkit2gtk-4.0-dev libappindicator3-dev librsvg2-dev patchelf

# Fedora
sudo dnf install webkit2gtk4.0-devel libappindicator-gtk3-devel librsvg2-devel patchelf

# Arch Linux
sudo pacman -S webkit2gtk libappindicator-gtk3 librsvg patchelf
```

## File Format

PromptMaster uses markdown files with YAML frontmatter for human-readable storage:

### File Naming Convention

```
YYYY-MM-DD--title-slug--v1.0.0.md
```

**Examples:**
- `2025-07-06--my-first-prompt--v1.0.0.md`
- `2025-07-06--data-analysis-helper--v2.1.0.md`

### File Structure

```markdown
---
uuid: "0197df29-124f-7462-afa8-afee3bf67e8e"
version: "1.0.0"
title: "My First Test Prompt"
tags: ["test", "demo", "validation"]
created: 2025-07-06
modified: 2025-07-06
---

This is the prompt content.

You can use **markdown** formatting:
- Lists
- *Emphasis*
- `Code blocks`

The content can span multiple lines and paragraphs.
```

### Frontmatter Fields

| Field | Type | Description |
|-------|------|-------------|
| `uuid` | String | Unique identifier (UUID v7) |
| `version` | String | Semantic version (e.g., "1.0.0") |
| `title` | String | Human-readable title |
| `tags` | Array | List of tags for organization |
| `created` | Date | Creation date (YYYY-MM-DD) |
| `modified` | Date | Last modification date (YYYY-MM-DD) |

## Data Storage

### Locations

- **Database**: `~/Documents/PromptMaster/promptmaster.db`
- **Markdown files**: `~/Documents/PromptMaster/`

### Database Schema

**prompts** table:
- `uuid` (TEXT PRIMARY KEY)
- `title` (TEXT)
- `tags` (TEXT, JSON array)
- `created_at` (TEXT, ISO 8601)
- `updated_at` (TEXT, ISO 8601)

**versions** table:
- `uuid` (TEXT PRIMARY KEY)
- `prompt_uuid` (TEXT, foreign key)
- `semver` (TEXT, semantic version)
- `body` (TEXT, prompt content)
- `parent_version_uuid` (TEXT, nullable)
- `created_at` (TEXT, ISO 8601)

**runs** table:
- `uuid` (TEXT PRIMARY KEY)
- `prompt_uuid` (TEXT, foreign key)
- `version_uuid` (TEXT, foreign key)
- `input_text` (TEXT)
- `output_text` (TEXT)
- `bleu_score` (REAL, nullable)
- `rouge_score` (REAL, nullable)
- `judge_score` (REAL, nullable)
- `tokens_input` (INTEGER)
- `tokens_output` (INTEGER)
- `cost_usd` (REAL)
- `created_at` (TEXT, ISO 8601)

**prompts_fts** (FTS5 virtual table):
- Full-text search index

## Keyboard Shortcuts

| Shortcut | Action | Context |
|----------|--------|---------|
| `Cmd+N` / `Ctrl+N` | Create new prompt | Global |
| `Cmd+S` / `Ctrl+S` | Save prompt with auto-version bump | Editor |
| `Cmd+D` / `Ctrl+D` | Toggle diff viewer | Editor |
| `Esc` | Exit diff mode | Diff viewer |
| `Cmd+Enter` / `Ctrl+Enter` | Run prompt (planned) | Editor |
| `F12` / `Cmd+Option+I` | Open developer tools | Development only |

## Development

### Project Structure

```
promptmaster-lite/
├── src/                    # React frontend
│   ├── components/         # Reusable UI components
│   ├── pages/             # Page components
│   └── main.tsx           # App entry point
├── src-tauri/             # Rust backend
│   ├── src/
│   │   ├── db.rs          # Database initialization
│   │   ├── prompts.rs     # Prompt management
│   │   ├── watcher.rs     # File watcher
│   │   └── main.rs        # App entry point
│   └── tauri.conf.json    # Tauri configuration
└── package.json           # Node.js dependencies
```

### Available Scripts

```bash
npm run dev              # Start Vite dev server only
npm run tauri dev        # Start Tauri development mode
npm run build            # Build frontend for production
npm run tauri build      # Build Tauri app for production
```

### Tech Stack

**Frontend:**
- React 18.3.1 + TypeScript
- Vite 6.0.3 (build tool)
- Tailwind CSS 3.4.17 (styling)
- React Router DOM 7.6.3 (routing)
- Zustand 5.0.6 (state management)
- Monaco Editor (code editing)
- React Markdown + remark-gfm (preview rendering)
- React Resizable Panels (layout)

**Backend:**
- Rust + Tauri 2.0
- SQLite with rusqlite 0.31 (connection pooling)
- File watching with notify 6.0 (selective .md file monitoring)
- Structured logging with env_logger 0.10
- Custom error handling with proper propagation

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Run tests: `npm run tauri build` (ensures it compiles)
5. Commit your changes: `git commit -m 'Add feature'`
6. Push to the branch: `git push origin feature-name`
7. Submit a pull request

## CI/CD

GitHub Actions automatically:
- Runs TypeScript checks
- Compiles Rust code
- Builds for macOS, Windows, and Linux
- Creates release artifacts

## Troubleshooting

### Build Issues

**Error: "webkit2gtk not found"**
```bash
# Install webkit2gtk development headers
sudo apt-get install libwebkit2gtk-4.0-dev
```

**Error: "failed to bundle project"**
- This is usually a DMG creation issue on macOS
- The .app bundle is still created successfully
- Check `src-tauri/target/release/bundle/macos/`

**Error: "crate required to be available in rlib format"**
```bash
# Clean build cache and rebuild
cargo clean
npm run tauri dev
```

### Database Issues

**Database not found**
- Database is created automatically on first run
- Location: `~/Documents/PromptMaster/promptmaster.db`
- Uses connection pooling for better performance

**File sync issues**
- File watcher automatically syncs external file changes
- Only monitors `.md` files (ignores database/temp files)
- Restart the app if sync stops working

### Performance Issues

**Too many toast notifications**
- File watcher now debounces changes (500ms)
- Only shows toasts for user-initiated actions
- Silent reloads for file system changes

**Application logging**
- Set `RUST_LOG=debug` environment variable for detailed logs
- Logs show database operations, file changes, and errors

## License

MIT License - see LICENSE file for details.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
- [WebStorm](https://www.jetbrains.com/webstorm/) or [IntelliJ IDEA](https://www.jetbrains.com/idea/) with Rust plugin