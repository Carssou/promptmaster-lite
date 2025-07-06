# Core Editing Experience – Functional & Technical Specification

This document describes **what** we are implementing (feature‑by‑feature), independent of any timeline or sprint cadence.

---

## 1  Monaco Editor Integration

### 1.1  Component Contract

```tsx
<PromptEditor
  value={string}              // full prompt text
  language="markdown"        // fixed for v1
  onChange={(val)=>void}
  readOnly={boolean}          // when viewing history diff
  markers={Marker[]}          // to highlight invalid YAML, etc.
/>
```

### 1.2  Configuration

- Load via `@monaco-editor/react` lazy ESM workers.
- Theme: `vs-dark` + custom Tailwind token colors.
- Word wrap enabled (`wordWrap: "on"`).
- Auto‑closing brackets, tabSize = 2.
- Register **markdown** + **yaml** snippets for front‑matter scaffold.

### 1.3  Data Flow

1. Component mounts; fetches latest version body via IPC `versions.getLatest(uuid)`.
2. Editor emits `onChange`; value held in Zustand `editorDraft` atom for unsaved diff detection.
3. On Save (Cmd+S) → send IPC `versions.saveNew(uuid, body)`.

### 1.4  Error Handling

- Failed IPC returns toast error + red gutter marker.
- Autosave disabled until error resolved.

---

## 2  Live Preview Panel with Variable Substitution

### 2.1  Placeholder Syntax

- Must match `{{variable}}` (double‑braces, lowercase snake‑case).
- Parser regex: `/{{\s*([a-zA-Z0-9_]+)\s*}}/g`.

### 2.2  Substitution Sources (ordered)

1. **Manual Overrides** – user types into sidebar “Preview Variables”.
2. `` from YAML front‑matter (if it is an object map).
3. Fallback token: `«var»` (gives visual cue, no braces).

### 2.3  Rendering Pipeline

1. Fetch `editorDraft` every 400 ms (debounce).
2. Perform placeholder substitution into cloned string.
3. Render via `<ReactMarkdown remarkPlugins={[remarkGfm]} />` with syntax‑highlight plugin.

### 2.4  Edge Cases

- Unclosed braces → highlight in preview as red `«var»`.
- Nested braces unsupported in v1 (raise lint warning).

---

## 3  Monaco Diff Viewer for Version Comparison

### 3.1  Invocation Flow

1. User selects **two** rows in Version History sidebar.
2. UI swaps `PromptEditor` → `PromptDiff`.
3. `PromptDiff` uses `MonacoDiffEditor` with:
   ```ts
   original={versionA.body}
   modified={versionB.body}
   options={{ renderSideBySide: false, ignoreTrimWhitespace: true }}
   ```

### 3.2  UX Notes

- Header bar shows "v2.1.0 ➜ v2.1.1".
- Color‑blind‑safe green/red.
- “Exit Diff” button returns to editor.

### 3.3  Performance Budget

- Target load & diff under 150 ms for ≤10 kB prompts.
- If prompt body >2 MB → show modal "Diff too large".

---

## 4  Auto‑Version Bump on Save

### 4.1  Version Scheme

- Semantic patch‑only bump in v1: **X.Y.Z** increments Z.
- Future flag `major=true|minor=true` for API‑breaking or feature increments.

### 4.2  Backend Service (Rust)

```rust
#[tauri::command]
fn save_new_version(prompt_uuid: &str, body: &str) -> Result<String> {  // returns new semver
   let latest = db::latest_version(prompt_uuid)?;        // "2.1.0"
   let new_ver = bump_patch(&latest);                    // "2.1.1"
   db::insert_version(prompt_uuid, &new_ver, body)?;
   fs::write(md_path(prompt_uuid,&new_ver), body)?;
   Ok(new_ver)
}
```

### 4.3  Failure Modes

| Failure            | Handling                           |
| ------------------ | ---------------------------------- |
| DB insert fails    | Transaction rollback; toast error. |
| File write fails   | DB rolled back; toast.             |
| Semver parse error | Fallback to `1.0.0`.               |

---

## 5  Basic Version History UI

### 5.1  Layout

```
┌ HistoryPanel ──────────────┐
│ v2.1.2  2025‑07‑06 08:32   │
│ v2.1.1  2025‑07‑06 08:21   │ diff
│ v2.1.0  2025‑07‑05 21:14   │ diff
└────────────────────────────┘
```

### 5.2  Interactions

- **Single click** → load that version in read‑only mode.
- **Shift‑click second row** → enter diff mode.
- **Rollback** button appears when a past version is selected (not head). Click → IPC `versions.rollback(target_uuid)`.
- Tooltip shows changelog (future field).

### 5.3  Data Retrieval

```sql
SELECT semver, created_at FROM versions WHERE prompt_uuid = ? ORDER BY created_at DESC;
```

---

## 6  Keyboard Shortcuts

| Shortcut       | Scope                      | Action                                    |
| -------------- | -------------------------- | ----------------------------------------- |
| **⌘/Ctrl + S** | Anywhere in EditorScreen   | Trigger save + auto‑bump.                 |
| **⌘/Ctrl + ↵** | EditorScreen               | Run active prompt against selected model. |
| **⌘/Ctrl + D** | When two versions selected | Toggle diff view.                         |
| **Esc**        | Diff view                  | Exit diff to editor.                      |

### 6.1  Implementation

- Use `@ctrlplusk/hotkeys` (1 kB) wrapper.
- Register in `useEffect`; deregister on unmount to avoid leaks.
- Respect OS: `navigator.platform.includes("Mac")` to display ⌘ vs Ctrl in tooltips.

---

## 7  Non‑Functional Requirements

| Area          | Requirement                                                    |
| ------------- | -------------------------------------------------------------- |
| Performance   | <50 ms keystroke‑to‑preview latency.                           |
| Accessibility | Editor & diff keyboard navigable; ARIA roles for buttons.      |
| Localization  | Strings in i18n JSON; default en‑US.                           |
| Testing       | Jest unit for parser; Playwright E2E: edit → save → diff flow. |

---

## 8  Security & Error Logging

- Sanitise Markdown preview (`rehype‑sanitize`).
- Strip API keys if they leak into prompt content (regex `sk-\w{48}`).
- Log errors to rotating `promptmaster.log`; no PII.

---

## 9  Extensibility Hooks

- **Markers API** – other plugins can push Monaco markers (e.g. AI linting).
- **onSave callback** – emits event with `(prompt_uuid, version_uuid)` for plugin listeners.
- **Diff service** – exposed so CLI `prompt diff` can re‑use same logic.

---

*Spec version 1.0 – 2025‑07‑06*

