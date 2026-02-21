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
  signIn: (email: string, password: string) => Promise<void>;
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

async function fetchProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    throw new Error('Failed to load user profile');
  }

  return data as Profile;
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

  const clearState = useCallback(() => {
    setUser(null);
    setProfile(null);
    setError(null);
  }, []);

  const loadProfile = useCallback(
    async (authUser: User) => {
      try {
        const userProfile = await fetchProfile(authUser.id);

        if (!userProfile.is_active) {
          await supabase.auth.signOut();
          clearState();
          setError('Account is deactivated');
          return;
        }

        setUser(authUser);
        setProfile(userProfile);
        setError(null);
      } catch {
        await supabase.auth.signOut();
        clearState();
        setError('Failed to load user profile');
      }
    },
    [clearState],
  );

  useEffect(() => {
    let mounted = true;

    async function initSession() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (session?.user) {
          await loadProfile(session.user);
        }
      } catch {
        if (mounted) {
          setError('Failed to restore session');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    initSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT' || !session?.user) {
        clearState();
        setLoading(false);
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        await loadProfile(session.user);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile, clearState]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      setError(null);

      try {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authError) {
          throw authError;
        }
        // Profile loading is handled by onAuthStateChange listener
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Sign in failed';
        setError(message);
        setLoading(false);
        throw err;
      }
    },
    [],
  );

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      clearState();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Sign out failed';
      setError(message);
      throw err;
    }
  }, [clearState]);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      profile,
      loading,
      error,
      signIn,
      signOut,
    }),
    [user, profile, loading, error, signIn, signOut],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}
