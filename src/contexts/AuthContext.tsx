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
    let authStateChangeHandled = false

    // Get initial session with timeout fallback
    const initializeAuth = async () => {
      // Add timeout to prevent infinite hanging
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('getSession timeout after 5s')), 5000)
      )

      try {
        const result = await Promise.race([
          supabase.auth.getSession(),
          timeoutPromise
        ]) as Awaited<ReturnType<typeof supabase.auth.getSession>>

        const initialSession = result.data?.session

        if (initialSession?.user && isMounted) {
          setSession(initialSession)
          setUser(initialSession.user)
          const profileData = await fetchProfile(initialSession.user.id)
          if (isMounted) {
            setProfile(profileData)
          }

          // Update last login (don't await - fire and forget)
          const updateClient = supabase as unknown as { from: (table: string) => { update: (data: Record<string, string>) => { eq: (col: string, val: string) => void } } }
          void updateClient
            .from('profiles')
            .update({ last_login_at: new Date().toISOString() })
            .eq('id', initialSession.user.id)
        }
      } catch (error) {
        console.error('[AuthContext] Error initializing auth:', error)
        // If getSession timed out but onAuthStateChange hasn't fired yet, wait for it
        if (error instanceof Error && error.message.includes('timeout') && !authStateChangeHandled) {
          // Wait a bit for onAuthStateChange to fire, then set loading to false
          setTimeout(() => {
            if (isMounted && !authStateChangeHandled) {
              setIsLoading(false)
            }
          }, 2000)
          return
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    initializeAuth()

    // Listen for auth state changes - this is more reliable than getSession
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        authStateChangeHandled = true
        if (isMounted) {
          setSession(newSession)
          setUser(newSession?.user ?? null)

          if (newSession?.user) {
            const profileData = await fetchProfile(newSession.user.id)
            if (isMounted) {
              setProfile(profileData)
              setIsLoading(false)
            }
          } else {
            if (isMounted) {
              setProfile(null)
              setIsLoading(false)
            }
          }
        }
      }
    )

    return () => {
      isMounted = false
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
