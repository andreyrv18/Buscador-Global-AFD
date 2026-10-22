// setupTests.ts
import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Garante o objeto mockado no ambiente global (jsdom)
globalThis.chrome = {
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
    getURL: vi.fn((path: string) => `chrome-extension://mock-id/${path}`),
  },
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn(),
    },
    sync: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn(),
    },
  },
  sidePanel: {
    setOptions: vi.fn(),
  },
} as unknown as typeof chrome;