import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAuthManager, type AuthDeps } from './auth-manager';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '@/lib/types';

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-123',
    email: 'test@example.com',
    aud: 'authenticated',
    role: '',
    app_metadata: {},
    user_metadata: {},
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  } as User;
}

function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'user-123',
    username: 'testuser',
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
    name: 'Test User',
    role: 'employee',
    avatar_url: null,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    last_login_at: null,
    ...overrides,
  };
}

function createMockDeps(overrides: Partial<AuthDeps> = {}): AuthDeps {
  const user = makeUser();
  return {
    signInWithPassword: vi.fn().mockResolvedValue({ error: null, data: { user } }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    getSession: vi.fn().mockResolvedValue({ data: { session: { user } }, error: null }),
    fetchProfile: vi.fn().mockResolvedValue(makeProfile()),
    ...overrides,
  };
}

describe('auth-manager', () => {
  describe('initSession', () => {
    it('should load profile when session exists', async () => {
      const deps = createMockDeps();
      const manager = createAuthManager(deps);

      await manager.initSession();

      const state = manager.getState();
      expect(state.user).toBeTruthy();
      expect(state.user?.id).toBe('user-123');
      expect(state.profile?.username).toBe('testuser');
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should set loading to false when no session exists', async () => {
      const deps = createMockDeps({
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      });
      const manager = createAuthManager(deps);

      await manager.initSession();

      const state = manager.getState();
      expect(state.user).toBeNull();
      expect(state.profile).toBeNull();
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should set error when getSession throws', async () => {
      const deps = createMockDeps({
        getSession: vi.fn().mockRejectedValue(new Error('Network error')),
      });
      const manager = createAuthManager(deps);

      await manager.initSession();

      const state = manager.getState();
      expect(state.error).toBe('Failed to restore session');
      expect(state.loading).toBe(false);
    });

    it('should sign out and set error for deactivated user', async () => {
      const deps = createMockDeps({
        fetchProfile: vi.fn().mockResolvedValue(makeProfile({ is_active: false })),
      });
      const manager = createAuthManager(deps);

      await manager.initSession();

      const state = manager.getState();
      expect(state.user).toBeNull();
      expect(state.profile).toBeNull();
      expect(state.error).toBe('Account is deactivated');
      expect(deps.signOut).toHaveBeenCalled();
    });

    it('should sign out and set error when fetchProfile fails', async () => {
      const deps = createMockDeps({
        fetchProfile: vi.fn().mockRejectedValue(new Error('DB error')),
      });
      const manager = createAuthManager(deps);

      await manager.initSession();

      const state = manager.getState();
      expect(state.user).toBeNull();
      expect(state.error).toBe('Failed to load user profile');
      expect(deps.signOut).toHaveBeenCalled();
    });
  });

  describe('signIn', () => {
    it('should sign in successfully and load profile', async () => {
      const deps = createMockDeps();
      const manager = createAuthManager(deps);

      await manager.signIn('test@example.com', 'password123');

      const state = manager.getState();
      expect(state.user?.id).toBe('user-123');
      expect(state.profile?.role).toBe('employee');
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(deps.signInWithPassword).toHaveBeenCalledWith('test@example.com', 'password123');
    });

    it('should set error and rethrow when signInWithPassword returns error', async () => {
      const deps = createMockDeps({
        signInWithPassword: vi.fn().mockResolvedValue({
          error: new Error('Invalid login credentials'),
          data: { user: null },
        }),
      });
      const manager = createAuthManager(deps);

      await expect(manager.signIn('bad@email.com', 'wrong')).rejects.toThrow('Invalid login credentials');

      const state = manager.getState();
      expect(state.error).toBe('Invalid login credentials');
      expect(state.loading).toBe(false);
    });

    it('should set loading to true during sign in', async () => {
      const deps = createMockDeps();
      const manager = createAuthManager(deps);

      const promise = manager.signIn('test@example.com', 'pass');

      // While in flight, loading should be true
      expect(manager.getState().loading).toBe(true);

      await promise;
      expect(manager.getState().loading).toBe(false);
    });
  });

  describe('signOut', () => {
    it('should clear user and profile on sign out', async () => {
      const deps = createMockDeps();
      const manager = createAuthManager(deps);

      // Sign in first
      await manager.signIn('test@example.com', 'pass');
      expect(manager.getState().user).toBeTruthy();

      // Sign out
      await manager.signOut();

      const state = manager.getState();
      expect(state.user).toBeNull();
      expect(state.profile).toBeNull();
      expect(state.error).toBeNull();
    });

    it('should set error and rethrow when signOut fails', async () => {
      const deps = createMockDeps({
        signOut: vi.fn().mockRejectedValue(new Error('Network offline')),
      });
      const manager = createAuthManager(deps);

      await expect(manager.signOut()).rejects.toThrow('Network offline');

      const state = manager.getState();
      expect(state.error).toBe('Network offline');
    });
  });

  describe('subscribe', () => {
    it('should notify listeners on state changes', async () => {
      const deps = createMockDeps();
      const manager = createAuthManager(deps);

      const listener = vi.fn();
      manager.subscribe(listener);

      await manager.initSession();

      expect(listener).toHaveBeenCalled();
    });

    it('should stop notifying after unsubscribe', async () => {
      const deps = createMockDeps({
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      });
      const manager = createAuthManager(deps);

      const listener = vi.fn();
      const unsub = manager.subscribe(listener);
      unsub();

      await manager.initSession();

      expect(listener).not.toHaveBeenCalled();
    });
  });
});
