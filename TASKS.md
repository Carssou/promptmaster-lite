# PromptMaster Lite - Core Editing Experience Implementation Tasks

This document breaks down the implementation of the [Core Editing Experience Specification](core_editing_experience_spec.md) into actionable development tasks.

## 📋 Implementation Overview

The core editing experience consists of 9 major components that will transform PromptMaster Lite from a basic prompt manager into a full-featured editing environment with Monaco Editor, live preview, version diffing, and professional keyboard shortcuts.

---

## 🎯 Phase 1: Foundation (Week 1-2)

### Task 1.1: Monaco Editor Integration
**Priority: High** | **Estimated effort: 3-4 days**

#### Frontend Tasks:
- [x] Install dependencies: `@monaco-editor/react`, `@monaco-editor/loader`
- [x] Create `PromptEditor` component with TypeScript interface
- [x] Configure Monaco with:
  - [x] `vs-dark` theme + custom Tailwind colors
  - [x] Word wrap enabled (`wordWrap: "on"`)
  - [x] Auto-closing brackets, tabSize = 2
  - [x] Markdown language support
- [x] Register YAML + Markdown snippets for frontmatter scaffold
- [x] Implement error markers system for invalid YAML
- [x] Add lazy ESM worker loading configuration

#### Backend Tasks:
- [ ] Create `versions.rs` module with commands:
  - [ ] `get_latest_version(prompt_uuid)` - returns version body
  - [ ] `save_new_version(prompt_uuid, body)` - saves with auto-bump
- [ ] Add version retrieval to existing database schema
- [ ] Update error handling for version operations

#### Integration Tasks:
- [x] Connect editor to Zustand `editorDraft` atom
- [x] Implement onChange debouncing (400ms)
- [x] Add unsaved changes detection
- [x] Create Save (Cmd+S) handler with IPC integration

### Task 1.2: Auto-Version Bump System
**Priority: High** | **Estimated effort: 2-3 days**

#### Backend Tasks:
- [ ] Implement semantic version parsing and bump logic
- [ ] Create `bump_patch()` function for Z increment
- [ ] Add transaction-based version creation
- [ ] Implement file system sync for markdown files
- [ ] Add error handling for version conflicts

#### Database Tasks:
- [ ] Verify `versions` table schema supports semver
- [ ] Add indexes for version queries
- [ ] Create version ordering by semver logic

#### Frontend Tasks:
- [ ] Add version display in editor header
- [ ] Implement save success/error toasts
- [ ] Add version bump confirmation (future flag)

---

## 🎯 Phase 2: Live Preview & Variables (Week 3)

### Task 2.1: Variable Substitution Engine
**Priority: High** | **Estimated effort: 2-3 days**

#### Core Implementation:
- [x] Create variable parser with regex `/{{\\s*([a-zA-Z0-9_]+)\\s*}}/g`
- [x] Implement substitution hierarchy:
  1. Manual overrides (user input)
  2. YAML frontmatter variables
  3. Fallback tokens `«var»`
- [x] Add validation for unclosed braces
- [x] Create variable extraction utility
- [x] Add nested braces detection (lint warning)

#### Frontend Tasks:
- [x] Create "Preview Variables" sidebar panel
- [x] Add variable input fields with auto-detection
- [x] Implement variable highlighting in preview
- [x] Add error states for invalid variables

### Task 2.2: Live Preview Panel
**Priority: High** | **Estimated effort: 2 days**

#### Implementation:
- [x] Install `react-markdown`, `remark-gfm`, syntax highlighting plugins
- [x] Create `LivePreview` component with 400ms debounce
- [x] Implement markdown rendering pipeline
- [x] Add variable substitution before rendering
- [x] Create split-pane layout (editor | preview)

#### Security:
- [x] Add `rehype-sanitize` for markdown sanitization
- [x] Implement API key detection and stripping (regex `sk-\\w{48}`)
- [x] Add XSS protection for user variables

---

## 🎯 Phase 3: Version History & Diff (Week 4)

### Task 3.1: Version History UI
**Priority: Medium** | **Estimated effort: 2-3 days**

#### Frontend Tasks:
- [x] Create `VersionHistory` sidebar component
- [x] Implement version list with semver + timestamp
- [x] Add single-click → read-only mode
- [x] Add shift-click → diff mode selection
- [x] Create rollback button for past versions
- [x] Add version tooltips (future: changelog)

#### Backend Tasks:
- [ ] Create `list_versions(prompt_uuid)` IPC command
- [ ] Implement version ordering by created_at DESC
- [ ] Add rollback functionality
- [ ] Create version loading by UUID

### Task 3.2: Monaco Diff Viewer
**Priority: Medium** | **Estimated effort: 2-3 days**

#### Implementation:
- [x] Create `PromptDiff` component using `MonacoDiffEditor`
- [x] Configure diff options: `renderSideBySide: false`, `ignoreTrimWhitespace: true`
- [x] Add version comparison header "v2.1.0 ➜ v2.1.1"
- [x] Implement color-blind-safe green/red theme
- [x] Add "Exit Diff" button functionality
- [x] Add performance check for large prompts (>2MB)

#### UX Tasks:
- [x] Add loading states for diff generation
- [x] Implement diff navigation controls
- [x] Add copy diff to clipboard functionality
- [x] Create diff export options

---

## 🎯 Phase 4: Keyboard Shortcuts & Polish (Week 5)

### Task 4.1: Keyboard Shortcuts System
**Priority: Medium** | **Estimated effort: 1-2 days**

#### Implementation:
- [x] Install `@ctrlplusk/hotkeys` (1kB wrapper)
- [x] Create hotkey registration system:
  - [x] **⌘/Ctrl + S** → Save + auto-bump
  - [x] **⌘/Ctrl + ↵** → Run prompt (future)
  - [x] **⌘/Ctrl + D** → Toggle diff view
  - [x] **Esc** → Exit diff mode
- [x] Add OS detection for ⌘ vs Ctrl display
- [x] Implement hotkey cleanup on unmount
- [ ] Add keyboard shortcuts help modal

### Task 4.2: Non-Functional Requirements
**Priority: Low** | **Estimated effort: 2-3 days**

#### Performance:
- [ ] Optimize keystroke-to-preview latency (<50ms)
- [ ] Add performance monitoring
- [ ] Implement virtual scrolling for large version lists
- [ ] Add loading states and skeleton screens

#### Accessibility:
- [ ] Add ARIA roles for all interactive elements
- [ ] Implement keyboard navigation for editor & diff
- [ ] Add screen reader support
- [ ] Ensure color contrast compliance

#### Testing:
- [ ] Set up Jest unit tests for variable parser
- [ ] Create Playwright E2E tests:
  - [ ] Edit → Save → Diff flow
  - [ ] Variable substitution
  - [ ] Version history navigation
- [ ] Add component integration tests

---

## 🎯 Phase 5: Security & Extensibility (Week 6)

### Task 5.1: Security Hardening
**Priority: Medium** | **Estimated effort: 1-2 days**

#### Implementation:
- [ ] Implement markdown sanitization pipeline
- [ ] Add API key detection and removal
- [ ] Create rotating log system (`promptmaster.log`)
- [ ] Add error logging without PII
- [ ] Implement input validation for all IPC commands

### Task 5.2: Extensibility Hooks
**Priority: Low** | **Estimated effort: 1-2 days**

#### API Design:
- [ ] Create Monaco Markers API for plugins
- [ ] Implement onSave callback system
- [ ] Expose diff service for CLI integration
- [ ] Add plugin event system
- [ ] Create extension point documentation

---

## 📦 Dependencies to Install

### Frontend:
```bash
npm install @monaco-editor/react @monaco-editor/loader
npm install react-markdown remark-gfm rehype-sanitize
npm install @ctrlplusk/hotkeys
npm install react-split-pane
```

### Development:
```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom
npm install --save-dev @playwright/test
npm install --save-dev jest-environment-jsdom
```

---

## 🎯 Success Criteria

### Phase 1 Complete:
- [ ] Monaco editor loads with markdown support
- [ ] Save functionality works with auto-version bump
- [ ] Basic version creation and retrieval

### Phase 2 Complete:
- [ ] Live preview updates with variable substitution
- [ ] Variable sidebar shows detected variables
- [ ] Markdown renders correctly with syntax highlighting

### Phase 3 Complete:
- [ ] Version history sidebar shows all versions
- [ ] Diff viewer compares any two versions
- [ ] Rollback functionality works

### Phase 4 Complete:
- [ ] All keyboard shortcuts work as specified
- [ ] Performance meets <50ms keystroke latency
- [ ] Accessibility requirements met

### Phase 5 Complete:
- [ ] Security measures implemented
- [ ] Extensibility hooks available
- [ ] Full test coverage

---

## 🔄 Integration Points

### Existing Codebase:
- [ ] Update `src/pages/Dashboard.tsx` to link to new editor
- [ ] Extend `src-tauri/src/prompts.rs` with version commands
- [ ] Update `src-tauri/src/database.rs` with version queries
- [ ] Modify `src-tauri/src/main.rs` to register new commands

### New File Structure:
```
src/
├── components/
│   ├── editor/
│   │   ├── PromptEditor.tsx
│   │   ├── PromptDiff.tsx
│   │   └── LivePreview.tsx
│   ├── version/
│   │   ├── VersionHistory.tsx
│   │   └── VersionCard.tsx
│   └── variables/
│       └── VariablePanel.tsx
├── hooks/
│   ├── useHotkeys.ts
│   ├── useVersions.ts
│   └── useVariables.ts
├── services/
│   ├── variableParser.ts
│   ├── versionBump.ts
│   └── diffService.ts
└── pages/
    └── EditorScreen.tsx
```

---

**Total Estimated Timeline: 5-6 weeks**
**Team Size: 1-2 developers**
**Risk Level: Medium** (Monaco integration complexity)

*Last Updated: 2025-07-06*