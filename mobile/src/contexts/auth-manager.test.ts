import { describe, it, expect, vi } from 'vitest';
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
  return {
    signInWithPassword: vi.fn().mockResolvedValue({ error: null, data: { user: makeUser() } }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    fetchProfile: vi.fn().mockResolvedValue(makeProfile()),
    ...overrides,
  };
}

describe('auth-manager', () => {
  describe('handleAuthEvent', () => {
    it('should set user when INITIAL_SESSION fires with a user', () => {
      const deps = createMockDeps();
      const manager = createAuthManager(deps);
      const user = makeUser();

      manager.handleAuthEvent('INITIAL_SESSION', user);

      const state = manager.getState();
      expect(state.user?.id).toBe('user-123');
      // loading remains true until loadProfile completes
      expect(state.loading).toBe(true);
    });

    it('should clear state and set loading false when INITIAL_SESSION has no user', () => {
      const deps = createMockDeps();
      const manager = createAuthManager(deps);

      manager.handleAuthEvent('INITIAL_SESSION', null);

      const state = manager.getState();
      expect(state.user).toBeNull();
      expect(state.profile).toBeNull();
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should set user when SIGNED_IN fires', () => {
      const deps = createMockDeps();
      const manager = createAuthManager(deps);
      const user = makeUser();

      manager.handleAuthEvent('SIGNED_IN', user);

      expect(manager.getState().user?.id).toBe('user-123');
    });

    it('should clear state on SIGNED_OUT', () => {
      const deps = createMockDeps();
      const manager = createAuthManager(deps);
      const user = makeUser();

      // First set a user
      manager.handleAuthEvent('SIGNED_IN', user);
      expect(manager.getState().user).toBeTruthy();

      // Then sign out
      manager.handleAuthEvent('SIGNED_OUT', null);

      const state = manager.getState();
      expect(state.user).toBeNull();
      expect(state.profile).toBeNull();
      expect(state.loading).toBe(false);
    });
  });

  describe('loadProfile', () => {
    it('should load profile and set loading false', async () => {
      const deps = createMockDeps();
      const manager = createAuthManager(deps);
      const user = makeUser();

      manager.handleAuthEvent('INITIAL_SESSION', user);
      await manager.loadProfile(user);

      const state = manager.getState();
      expect(state.profile?.username).toBe('testuser');
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should sign out and set error for deactivated user', async () => {
      const deps = createMockDeps({
        fetchProfile: vi.fn().mockResolvedValue(makeProfile({ is_active: false })),
      });
      const manager = createAuthManager(deps);
      const user = makeUser();

      manager.handleAuthEvent('INITIAL_SESSION', user);
      await manager.loadProfile(user);

      const state = manager.getState();
      expect(state.user).toBeNull();
      expect(state.profile).toBeNull();
      expect(state.error).toBe('Account is deactivated');
      expect(state.loading).toBe(false);
      expect(deps.signOut).toHaveBeenCalled();
    });

    it('should sign out and set error when fetchProfile fails', async () => {
      const deps = createMockDeps({
        fetchProfile: vi.fn().mockRejectedValue(new Error('DB error')),
      });
      const manager = createAuthManager(deps);
      const user = makeUser();

      manager.handleAuthEvent('INITIAL_SESSION', user);
      await manager.loadProfile(user);

      const state = manager.getState();
      expect(state.user).toBeNull();
      expect(state.error).toBe('Failed to load user profile');
      expect(state.loading).toBe(false);
      expect(deps.signOut).toHaveBeenCalled();
    });
  });

  describe('signIn', () => {
    it('should call signInWithPassword with correct email', async () => {
      const deps = createMockDeps();
      const manager = createAuthManager(deps);

      await manager.signIn('testuser', 'password123');

      expect(deps.signInWithPassword).toHaveBeenCalledWith('testuser@employee.internal', 'password123');
    });

    it('should complete full flow with handleAuthEvent + loadProfile', async () => {
      const deps = createMockDeps();
      const manager = createAuthManager(deps);
      const user = makeUser();

      await manager.signIn('testuser', 'password123');
      manager.handleAuthEvent('SIGNED_IN', user);
      await manager.loadProfile(user);

      const state = manager.getState();
      expect(state.user?.id).toBe('user-123');
      expect(state.profile?.role).toBe('employee');
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should set error and rethrow when signInWithPassword returns error', async () => {
      const deps = createMockDeps({
        signInWithPassword: vi.fn().mockResolvedValue({
          error: new Error('Invalid login credentials'),
          data: { user: null },
        }),
      });
      const manager = createAuthManager(deps);

      await expect(manager.signIn('baduser', 'wrong')).rejects.toThrow('Invalid login credentials');

      const state = manager.getState();
      expect(state.error).toBe('Invalid login credentials');
      expect(state.loading).toBe(false);
    });

    it('should lowercase username before constructing email', async () => {
      const deps = createMockDeps();
      const manager = createAuthManager(deps);

      await manager.signIn('TestUser', 'password123');

      expect(deps.signInWithPassword).toHaveBeenCalledWith('testuser@employee.internal', 'password123');
    });

    it('should set loading to true during sign in', async () => {
      const deps = createMockDeps();
      const manager = createAuthManager(deps);

      const promise = manager.signIn('testuser', 'pass');

      expect(manager.getState().loading).toBe(true);

      await promise;
      // loading remains true — set to false by auth event + loadProfile flow
      expect(manager.getState().loading).toBe(true);
    });
  });

  describe('signOut', () => {
    it('should clear user and profile on sign out', async () => {
      const deps = createMockDeps();
      const manager = createAuthManager(deps);
      const user = makeUser();

      // Establish session via handleAuthEvent + loadProfile
      manager.handleAuthEvent('SIGNED_IN', user);
      await manager.loadProfile(user);
      expect(manager.getState().user).toBeTruthy();

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
    it('should notify listeners on state changes', () => {
      const deps = createMockDeps();
      const manager = createAuthManager(deps);

      const listener = vi.fn();
      manager.subscribe(listener);

      manager.handleAuthEvent('INITIAL_SESSION', makeUser());

      expect(listener).toHaveBeenCalled();
    });

    it('should stop notifying after unsubscribe', () => {
      const deps = createMockDeps();
      const manager = createAuthManager(deps);

      const listener = vi.fn();
      const unsub = manager.subscribe(listener);
      unsub();

      manager.handleAuthEvent('INITIAL_SESSION', null);

      expect(listener).not.toHaveBeenCalled();
    });
  });
});
