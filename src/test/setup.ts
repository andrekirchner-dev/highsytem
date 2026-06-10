import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Recharts and other layout-dependent libraries need ResizeObserver
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub);

// JSDOM doesn't implement matchMedia
vi.stubGlobal('matchMedia', (query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));

// Mock firebase/app so initializeApp never hits the network
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
  getApp: vi.fn(() => ({})),
}));

// Mock the local firebase module so all consumers get a safe no-op db/auth
vi.mock('../lib/firebase', () => ({
  auth: { currentUser: null },
  db: {},
  default: {},
}));
