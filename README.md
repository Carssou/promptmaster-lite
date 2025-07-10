# PromptMaster Lite

A production-ready, local-first desktop application for managing AI prompts with versioning, live preview, and comprehensive testing. Built with Tauri 2.0 and React.

![PromptMaster Lite](https://img.shields.io/badge/version-0.5.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey.svg)
![Tests](https://img.shields.io/badge/tests-37%20passing-brightgreen.svg)
![Accessibility](https://img.shields.io/badge/accessibility-WCAG%20compliant-green.svg)

## ✨ What's New in v0.5.0

- ♿ **Full Accessibility**: WCAG compliant with ARIA roles, keyboard navigation, and screen reader support
- 🧪 **Comprehensive Testing**: 37 tests across unit, integration, and E2E levels
- 🔄 **Delete Recovery**: File watcher now recreates deleted .md files from database automatically
- 🔌 **Extensibility**: Complete metadata schema system with dynamic form generation and plugin hooks
- ⚡ **Performance**: Variable processing handles 100+ variables in <1ms with 12x cache improvement
- 🎯 **Production Ready**: All features complete with robust error handling and user experience

## Features

### Core Editing Experience

- 🖥️ **Monaco Editor** - Professional code editor with syntax highlighting across all pages
- 👁️ **Live Preview** - Real-time markdown rendering with variable substitution
- 🔧 **Variable Management** - Automatic `{{variable}}` detection with sidebar panel
- 📊 **Version Diff Viewer** - Side-by-side comparison with Monaco Diff Editor
- ⌨️ **Keyboard Shortcuts** - Complete hotkey system with help modal (Cmd+?)
- 📐 **Resizable Panels** - 3-panel layout (history, editor/preview, variables)
- 🛡️ **Security Validation** - Content sanitization prevents HTML injection
- 📝 **Enhanced Creation** - Professional editor interface for new prompts
- ⚡ **Performance Optimized** - <50ms keystroke latency with debouncing and memoization
- 📱 **Virtual Scrolling** - Efficient rendering of large version lists (20+ items)
- 💀 **Skeleton Loading** - Smooth loading states for all major components
- ♿ **Accessibility** - WCAG compliant with ARIA roles, keyboard navigation, screen reader support

### Data Management

- 🗂️ **Local-first prompt management** - All data stored locally in your Documents folder
- 📝 **Dual storage** - SQLite database + human-readable markdown files
- 🔄 **File watcher** - Automatic sync when you edit files externally + delete recovery
- 🏷️ **Tag-based organization**
- ⚡ **Semantic versioning** for prompts (1.0.0, 1.1.0, 2.0.0)
- 🔒 **Security logging** - Application logs with PII protection
- 📋 **Version history** - Complete rollback system with diff viewing
- 🔌 **Extensibility** - Complete metadata schema system with dynamic form generation and plugin hooks

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
- _Emphasis_
- `Code blocks`

The content can span multiple lines and paragraphs.
```

### Frontmatter Fields

| Field      | Type   | Description                         |
| ---------- | ------ | ----------------------------------- |
| `uuid`     | String | Unique identifier (UUID v7)         |
| `version`  | String | Semantic version (e.g., "1.0.0")    |
| `title`    | String | Human-readable title                |
| `tags`     | Array  | List of tags for organization       |
| `created`  | Date   | Creation date (YYYY-MM-DD)          |
| `modified` | Date   | Last modification date (YYYY-MM-DD) |

## Data Storage

### Locations

- **Database**: `~/Documents/PromptMaster/promptmaster.db`
- **Markdown files**: `~/Documents/PromptMaster/`
- **Application logs**: `~/Documents/PromptMaster/promptmaster.log`

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

| Shortcut                   | Action                             | Context          |
| -------------------------- | ---------------------------------- | ---------------- |
| `Cmd+N` / `Ctrl+N`         | Create new prompt                  | Global           |
| `Cmd+S` / `Ctrl+S`         | Save prompt with auto-version bump | Editor           |
| `Cmd+D` / `Ctrl+D`         | Toggle diff viewer                 | Editor           |
| `Cmd+B` / `Ctrl+B`         | Toggle version history sidebar     | Editor           |
| `Cmd+K` / `Ctrl+K`         | Toggle preview mode                | Editor           |
| `Cmd+?` / `Ctrl+?`         | Show keyboard shortcuts help       | Editor           |
| `Esc`                      | Exit diff mode or close modals     | Global           |
| `Cmd+Enter` / `Ctrl+Enter` | Run prompt (planned)               | Editor           |
| `F12` / `Cmd+Option+I`     | Open developer tools               | Development only |

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
# Development
npm run dev              # Start Vite dev server only
npm run tauri dev        # Start Tauri development mode
npm run build            # Build frontend for production
npm run tauri build      # Build Tauri app for production

# Testing
npm run test                    # Unit tests (Jest) - 18 tests
npm run test:integration        # Integration tests (Vitest) - 19 tests
npm run test:e2e               # E2E tests (Playwright)
npm run test:all               # Run all test suites
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
- React Window (virtual scrolling)
- Performance monitoring hooks

**Testing:**

- Jest (unit tests) - Variable parser functions
- Vitest (integration tests) - Component interactions & performance
- Playwright (E2E tests) - Complete user workflows
- Testing Library (React testing utilities)

**Backend:**

- Rust + Tauri 2.0
- SQLite with rusqlite 0.31 (connection pooling)
- File watching with notify 6.0 (selective .md file monitoring)
- Structured logging with env_logger 0.10
- Custom error handling with proper propagation

## Testing

PromptMaster Lite has a comprehensive test suite with three levels of testing:

### Unit Tests (Jest)

```bash
npm run test
```

- **18 tests** covering variable parser functions
- Focus: `parseVariables`, `substituteVariables`, `validateVariableUsage`
- Performance: <1s execution time

### Integration Tests (Vitest)

```bash
npm run test:integration
```

- **19 tests** covering component interactions and performance
- Real component state management (minimal mocking)
- Performance benchmarks: 100+ variables in <1ms
- Memory pressure testing with 1000+ content variations

### E2E Tests (Playwright)

```bash
npm run test:e2e
```

- Complete user workflow testing
- Multi-browser support (Chrome, Firefox, Safari)
- Test scenarios: Edit→Save→Diff, Variable substitution, Version history

### Run All Tests

```bash
npm run test:all
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Run the full test suite: `npm run test:all`
5. Ensure build succeeds: `npm run tauri build`
6. Commit your changes: `git commit -m 'Add feature'`
7. Push to the branch: `git push origin feature-name`
8. Submit a pull request

## CI/CD

GitHub Actions automatically:

- Runs full test suite (37 tests)
- TypeScript checks
- Compiles Rust code
- Builds for macOS, Windows, and Linux
- Creates release artifacts
- Accessibility compliance checks

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
- **Delete recovery**: Automatically recreates deleted .md files from database
- Restart the app if sync stops working

### Performance Issues

**Slow editor response**

- Editor optimized for <50ms keystroke latency
- Uses debouncing (300ms) and memoization for heavy operations
- Virtual scrolling kicks in for version lists >20 items
- Performance monitoring available in development mode

**Too many toast notifications**

- File watcher now debounces changes (500ms)
- Only shows toasts for user-initiated actions
- Silent reloads for file system changes

**Application logging**

- Set `RUST_LOG=debug` environment variable for detailed logs
- Logs show database operations, file changes, and errors
- Performance metrics logged in development mode

## License

MIT License - see LICENSE file for details.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
- [WebStorm](https://www.jetbrains.com/webstorm/) or [IntelliJ IDEA](https://www.jetbrains.com/idea/) with Rust plugin
