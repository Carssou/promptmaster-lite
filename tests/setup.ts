import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Tauri APIs
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(() => Promise.resolve(() => {})),
  emit: vi.fn(),
}));

vi.mock('@tauri-apps/api/path', () => ({
  documentDir: vi.fn(() => Promise.resolve('/mock/documents')),
}));

// Mock Monaco Editor
vi.mock('@monaco-editor/react', () => ({
  default: vi.fn(() => null),
}));

// Mock monaco-editor
vi.mock('monaco-editor', () => ({
  editor: {
    create: vi.fn(),
    setModelMarkers: vi.fn(),
  },
  languages: {
    registerCompletionItemProvider: vi.fn(),
  },
  KeyMod: {
    CtrlCmd: 1,
  },
  KeyCode: {
    KeyS: 1,
    KeyD: 1,
  },
  MarkerSeverity: {
    Error: 8,
    Warning: 4,
    Info: 1,
  },
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
  Toaster: vi.fn(() => null),
}));

// Global test utilities
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));