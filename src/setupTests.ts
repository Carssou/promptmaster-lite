import '@testing-library/jest-dom';

// Mock Tauri API
jest.mock('@tauri-apps/api/core', () => ({
  invoke: jest.fn(),
}));

jest.mock('@tauri-apps/api/event', () => ({
  listen: jest.fn(() => Promise.resolve(() => {})),
  emit: jest.fn(),
}));

// Mock Monaco Editor
jest.mock('@monaco-editor/react', () => ({
  __esModule: true,
  default: jest.fn(() => null),
  DiffEditor: jest.fn(() => null),
}));

// Mock React Router
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn(() => ({ promptId: 'test-prompt-id' })),
  useNavigate: jest.fn(() => jest.fn()),
}));