import type { User } from '@supabase/supabase-js';
import type { Profile } from '@/lib/types';

export interface AuthState {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  error: string | null;
}

export interface AuthDeps {
  signInWithPassword: (email: string, password: string) => Promise<{ error: Error | null; data: { user: User | null } }>;
  signOut: () => Promise<{ error: Error | null }>;
  getSession: () => Promise<{ data: { session: { user: User } | null }; error: Error | null }>;
  fetchProfile: (userId: string) => Promise<Profile>;
}

export function createAuthManager(deps: AuthDeps) {
  let state: AuthState = {
    user: null,
    profile: null,
    loading: true,
    error: null,
  };

  const listeners = new Set<() => void>();

  function getState(): AuthState {
    return state;
  }

  function setState(patch: Partial<AuthState>) {
    state = { ...state, ...patch };
    listeners.forEach((l) => l());
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }

  function clearState() {
    setState({ user: null, profile: null, error: null });
  }

  async function loadProfile(authUser: User): Promise<void> {
    try {
      const profile = await deps.fetchProfile(authUser.id);

      if (!profile.is_active) {
        await deps.signOut();
        clearState();
        setState({ error: 'Account is deactivated' });
        return;
      }

      setState({ user: authUser, profile, error: null });
    } catch {
      await deps.signOut();
      clearState();
      setState({ error: 'Failed to load user profile' });
    }
  }

  async function initSession(): Promise<void> {
    try {
      const { data: { session } } = await deps.getSession();
      if (session?.user) {
        await loadProfile(session.user);
      }
    } catch {
      setState({ error: 'Failed to restore session' });
    } finally {
      setState({ loading: false });
    }
  }

  async function signIn(email: string, password: string): Promise<void> {
    setState({ loading: true, error: null });
    try {
      const { error } = await deps.signInWithPassword(email, password);
      if (error) throw error;
      // In real app, onAuthStateChange fires and calls loadProfile
      // For the manager, we simulate it by fetching session
      const { data: { session } } = await deps.getSession();
      if (session?.user) {
        await loadProfile(session.user);
      }
      setState({ loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign in failed';
      setState({ error: message, loading: false });
      throw err;
    }
  }

  async function signOut(): Promise<void> {
    try {
      await deps.signOut();
      clearState();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign out failed';
      setState({ error: message });
      throw err;
    }
  }

  return { getState, subscribe, initSession, signIn, signOut };
}
