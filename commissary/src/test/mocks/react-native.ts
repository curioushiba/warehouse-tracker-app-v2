import { vi } from 'vitest';

export const AppState = {
  addEventListener: vi.fn(() => ({ remove: vi.fn() })),
  currentState: 'active',
};

export type AppStateStatus = 'active' | 'background' | 'inactive';

export const useWindowDimensions = vi.fn(() => ({ width: 375, height: 812 }));
