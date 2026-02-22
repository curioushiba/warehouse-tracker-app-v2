import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';

export interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

function requireSupabase(): NonNullable<typeof supabase> {
  if (!supabase) throw new Error('Supabase not configured');
  return supabase;
}

async function fetchProfile(userId: string): Promise<Profile> {
  const client = requireSupabase();

  const { data, error } = await client
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    throw new Error('Failed to load user profile');
  }

  return data as Profile;
}

function getErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);

  // Effect 1: Auth state listener -- SYNCHRONOUS callback, no Supabase API calls.
  // This avoids the deadlock where an async callback inside onAuthStateChange
  // tries to call getSession() which waits for the same lock.
  useEffect(() => {
    if (!supabase) {
      setError('Supabase not configured');
      setLoading(false);
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session?.user) {
        setUser(null);
        setProfile(null);
        setError(null);
        setLoading(false);
        return;
      }

      // INITIAL_SESSION, SIGNED_IN, TOKEN_REFRESHED
      setUser(session.user);
      setAuthReady(true);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Effect 2: Profile loader -- reacts to user changes, runs outside Supabase auth lock
  useEffect(() => {
    if (!authReady || !user) {
      if (authReady) {
        setProfile(null);
        setLoading(false);
      }
      return;
    }

    let cancelled = false;
    const currentUser = user;

    async function loadUserProfile(): Promise<void> {
      try {
        const userProfile = await fetchProfile(currentUser.id);
        if (cancelled) return;

        if (!userProfile.is_active) {
          await supabase?.auth.signOut();
          setError('Account is deactivated');
          return;
        }

        setProfile(userProfile);
        setError(null);
      } catch {
        if (cancelled) return;
        await supabase?.auth.signOut();
        setError('Failed to load user profile');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadUserProfile();

    return () => {
      cancelled = true;
    };
  }, [user, authReady]);

  const signIn = useCallback(
    async (username: string, password: string): Promise<void> => {
      const client = requireSupabase();
      setLoading(true);
      setError(null);

      try {
        const email = `${username.toLowerCase()}@employee.internal`;
        const { error: authError } = await client.auth.signInWithPassword({
          email,
          password,
        });
        if (authError) throw authError;
        // Profile loading handled by onAuthStateChange -> Effect 2
      } catch (err) {
        setError(getErrorMessage(err, 'Sign in failed'));
        setLoading(false);
        throw err;
      }
    },
    [],
  );

  const signOut = useCallback(async (): Promise<void> => {
    const client = requireSupabase();
    try {
      await client.auth.signOut();
      // onAuthStateChange handles state clearing
    } catch (err) {
      setError(getErrorMessage(err, 'Sign out failed'));
      throw err;
    }
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({ user, profile, loading, error, signIn, signOut }),
    [user, profile, loading, error, signIn, signOut],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}
