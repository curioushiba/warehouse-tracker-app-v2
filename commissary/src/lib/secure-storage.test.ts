import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock expo-secure-store
const mockStore: Record<string, string> = {};
vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(async (key: string) => mockStore[key] ?? null),
  setItemAsync: vi.fn(async (key: string, value: string) => { mockStore[key] = value; }),
  deleteItemAsync: vi.fn(async (key: string) => { delete mockStore[key]; }),
}));

// The async-storage mock is provided by vitest.config.ts alias

describe('secureStorage', () => {
  beforeEach(() => {
    // Clear mock stores
    Object.keys(mockStore).forEach((k) => delete mockStore[k]);
    vi.resetModules();
  });

  it('setItem stores and getItem retrieves', async () => {
    const { secureStorage } = await import('./secure-storage');
    await secureStorage.setItem('test-key', 'test-value');
    const result = await secureStorage.getItem('test-key');
    expect(result).toBe('test-value');
  });

  it('removeItem deletes a key', async () => {
    const { secureStorage } = await import('./secure-storage');
    await secureStorage.setItem('rm-key', 'value');
    await secureStorage.removeItem('rm-key');
    const result = await secureStorage.getItem('rm-key');
    expect(result).toBeNull();
  });

  it('getItem returns null for missing key', async () => {
    const { secureStorage } = await import('./secure-storage');
    const result = await secureStorage.getItem('nonexistent');
    expect(result).toBeNull();
  });
});
