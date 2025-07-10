import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    css: true,
  },
  resolve: {
    alias: {
      '@': '/src',
      'monaco-editor': 'monaco-editor/esm/vs/editor/editor.api.js',
    },
  },
  define: {
    global: 'globalThis',
  },
});