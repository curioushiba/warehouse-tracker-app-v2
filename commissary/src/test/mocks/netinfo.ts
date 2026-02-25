import { vi } from 'vitest';

let callback: ((state: { isConnected: boolean }) => void) | null = null;

export default {
  addEventListener: vi.fn((cb: (state: { isConnected: boolean }) => void) => {
    callback = cb;
    return () => { callback = null; };
  }),
  fetch: vi.fn(async () => ({ isConnected: true })),
  // Test helper to simulate connectivity change
  __simulateChange: (isConnected: boolean) => {
    callback?.({ isConnected });
  },
};
