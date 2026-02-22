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
  fetchProfile: (userId: string) => Promise<Profile>;
}

function getErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

const CLEARED: Pick<AuthState, 'user' | 'profile' | 'error'> = {
  user: null,
  profile: null,
  error: null,
};

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

  function setState(patch: Partial<AuthState>): void {
    state = { ...state, ...patch };
    listeners.forEach((l) => l());
  }

  function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }

  /** Synchronous -- only updates user state, no Supabase API calls */
  function handleAuthEvent(event: string, sessionUser: User | null): void {
    if (event === 'SIGNED_OUT' || !sessionUser) {
      setState({ ...CLEARED, loading: false });
      return;
    }
    // INITIAL_SESSION, SIGNED_IN, TOKEN_REFRESHED
    setState({ user: sessionUser });
  }

  async function loadProfile(authUser: User): Promise<void> {
    try {
      const profile = await deps.fetchProfile(authUser.id);

      if (!profile.is_active) {
        await deps.signOut();
        setState({ ...CLEARED, error: 'Account is deactivated', loading: false });
        return;
      }

      setState({ user: authUser, profile, error: null, loading: false });
    } catch {
      await deps.signOut();
      setState({ ...CLEARED, error: 'Failed to load user profile', loading: false });
    }
  }

  async function signIn(username: string, password: string): Promise<void> {
    setState({ loading: true, error: null });
    try {
      const email = `${username.toLowerCase()}@employee.internal`;
      const { error } = await deps.signInWithPassword(email, password);
      if (error) throw error;
      // Profile loading triggered by onAuthStateChange in real app
    } catch (err) {
      setState({ error: getErrorMessage(err, 'Sign in failed'), loading: false });
      throw err;
    }
  }

  async function signOut(): Promise<void> {
    try {
      await deps.signOut();
      setState({ ...CLEARED });
    } catch (err) {
      setState({ error: getErrorMessage(err, 'Sign out failed') });
      throw err;
    }
  }

  return { getState, subscribe, handleAuthEvent, loadProfile, signIn, signOut };
}
