'use client'

import { createContext, useContext, useEffect, useState, useMemo, useCallback, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User, Session } from '@supabase/supabase-js'
import type { Profile } from '@/lib/supabase/types'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  session: Session | null
  isLoading: boolean
  isAuthenticated: boolean
  isAdmin: boolean
  isEmployee: boolean
  isActive: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Get singleton Supabase client
  const supabase = createClient()

  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('[AuthContext] Error fetching profile:', error)
        return null
      }

      return data as Profile | null
    } catch (error) {
      console.error('[AuthContext] Exception fetching profile:', error)
      return null
    }
  }

  const refreshProfile = useCallback(async () => {
    if (user) {
      const profileData = await fetchProfile(user.id)
      setProfile(profileData)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  useEffect(() => {
    let isMounted = true
    let loadingResolved = false

    // Helper to fetch profile with timeout to prevent infinite hang
    // Increased timeout to 8s for slow connections
    const fetchProfileWithTimeout = async (userId: string, timeoutMs = 8000): Promise<Profile | null> => {
      const profilePromise = fetchProfile(userId)
      const timeoutPromise = new Promise<null>((resolve) =>
        setTimeout(() => {
          console.warn('[AuthContext] Profile fetch timed out')
          resolve(null)
        }, timeoutMs)
      )
      return Promise.race([profilePromise, timeoutPromise])
    }

    // onAuthStateChange fires immediately with current session (INITIAL_SESSION event)
    // This is more reliable than getSession() which can hang during token refresh
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!isMounted) return

        setSession(newSession)
        setUser(newSession?.user ?? null)

        if (newSession?.user) {
          const profileData = await fetchProfileWithTimeout(newSession.user.id)
          if (isMounted) {
            setProfile(profileData)
            loadingResolved = true
            setIsLoading(false)
          }

          // Update last login on sign in (fire and forget)
          if (event === 'SIGNED_IN') {
            // Type workaround for profiles table update
            const updateClient = supabase as unknown as {
              from: (table: string) => {
                update: (data: Record<string, string>) => {
                  eq: (col: string, val: string) => void
                }
              }
            }
            void updateClient
              .from('profiles')
              .update({ last_login_at: new Date().toISOString() })
              .eq('id', newSession.user.id)
          }
        } else {
          if (isMounted) {
            setProfile(null)
            loadingResolved = true
            setIsLoading(false)
          }
        }
      }
    )

    // Safety timeout: if onAuthStateChange hasn't resolved loading after 10s,
    // assume no session and stop loading to prevent infinite spinner
    const safetyTimeout = setTimeout(() => {
      if (isMounted && !loadingResolved) {
        console.warn('[AuthContext] Safety timeout - no auth state received after 10s')
        setIsLoading(false)
      }
    }, 10000)

    return () => {
      isMounted = false
      clearTimeout(safetyTimeout)
      subscription.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setSession(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const value = useMemo<AuthContextType>(() => ({
    user,
    profile,
    session,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: profile?.role === 'admin',
    isEmployee: profile?.role === 'employee',
    isActive: profile?.is_active ?? false,
    signOut,
    refreshProfile,
  }), [user, profile, session, isLoading, signOut, refreshProfile])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}
