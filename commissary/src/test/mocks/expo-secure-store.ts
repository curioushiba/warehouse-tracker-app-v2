import { vi } from 'vitest';

const store: Record<string, string> = {};

export const getItemAsync = vi.fn(async (key: string) => store[key] ?? null);
export const setItemAsync = vi.fn(async (key: string, value: string) => { store[key] = value; });
export const deleteItemAsync = vi.fn(async (key: string) => { delete store[key]; });
