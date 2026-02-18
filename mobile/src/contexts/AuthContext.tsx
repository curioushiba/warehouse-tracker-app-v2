import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from 'react'
import type { Profile } from '@/lib/supabase/types'
import { createClient } from '@/lib/supabase/client'
import { clearSession, getSessionToken, setSessionToken } from '@/lib/storage/mmkv'
import { clearQueue } from '@/lib/db/transaction-queue'
import { clearItemEditQueue } from '@/lib/db/item-edit-queue'
import { clearItemCreateQueue } from '@/lib/db/item-create-queue'
import { clearItemArchiveQueue } from '@/lib/db/item-archive-queue'

// --- Types ---

export interface AuthUser {
  id: string
  email: string
}

export interface AuthState {
  user: AuthUser | null
  profile: Profile | null
  isLoading: boolean
}

export interface AuthDerived {
  isAuthenticated: boolean
  isAdmin: boolean
  isEmployee: boolean
  isActive: boolean
}

export interface AuthManager {
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: (db?: unknown) => Promise<void>
  refreshProfile: () => Promise<void>
  restoreSession: () => Promise<void>
}

interface AuthContextValue extends AuthState, AuthDerived {
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: (db?: unknown) => Promise<void>
  refreshProfile: () => Promise<void>
}

// --- Pure logic (testable) ---

export function deriveAuthState(user: AuthUser | null, profile: Profile | null): AuthDerived {
  return {
    isAuthenticated: user !== null,
    isAdmin: profile?.role === 'admin',
    isEmployee: profile?.role === 'employee',
    isActive: profile?.is_active === true,
  }
}

export function createAuthManager(
  setState: (partial: Partial<AuthState>) => void,
  getState: () => AuthState
): AuthManager {
  const supabase = createClient()

  async function fetchProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (error || !data) return null
    return data as unknown as Profile
  }

  async function signIn(email: string, password: string): Promise<{ error: string | null }> {
    setState({ isLoading: true })
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data.user) {
      setState({ isLoading: false })
      return { error: error?.message ?? 'Sign in failed' }
    }
    const profile = await fetchProfile(data.user.id)
    setState({
      user: { id: data.user.id, email: data.user.email! },
      profile,
      isLoading: false,
    })
    if (data.session?.access_token) {
      setSessionToken(data.session.access_token)
    }
    return { error: null }
  }

  async function signOut(db?: unknown) {
    // Clear SQLite queues if db provided
    if (db) {
      try {
        clearQueue(db as never)
        clearItemEditQueue(db as never)
        clearItemCreateQueue(db as never)
        clearItemArchiveQueue(db as never)
      } catch {
        // Ignore errors during cleanup
      }
    }
    await supabase.auth.signOut()
    clearSession()
    setState({ user: null, profile: null, isLoading: false })
  }

  async function refreshProfile() {
    const { user } = getState()
    if (!user) return
    const profile = await fetchProfile(user.id)
    if (profile) {
      setState({ profile })
    }
  }

  async function restoreSession() {
    setState({ isLoading: true })
    const token = getSessionToken()
    if (!token) {
      setState({ isLoading: false })
      return
    }
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const profile = await fetchProfile(user.id)
        setState({
          user: { id: user.id, email: user.email! },
          profile,
          isLoading: false,
        })
      } else {
        clearSession()
        setState({ user: null, profile: null, isLoading: false })
      }
    } catch {
      clearSession()
      setState({ user: null, profile: null, isLoading: false })
    }
  }

  return { signIn, signOut, refreshProfile, restoreSession }
}

// --- React context ---

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const SAFETY_TIMEOUT_MS = 10_000

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setAuthState] = useState<AuthState>({
    user: null,
    profile: null,
    isLoading: true,
  })

  const stateRef = useRef(state)
  stateRef.current = state

  const managerRef = useRef<AuthManager | null>(null)
  if (!managerRef.current) {
    managerRef.current = createAuthManager(
      (partial) => setAuthState(prev => ({ ...prev, ...partial })),
      () => stateRef.current
    )
  }

  // Restore session on mount with safety timeout
  useEffect(() => {
    const timeout = setTimeout(() => {
      setAuthState(prev => prev.isLoading ? { ...prev, isLoading: false } : prev)
    }, SAFETY_TIMEOUT_MS)

    managerRef.current!.restoreSession().finally(() => clearTimeout(timeout))

    return () => clearTimeout(timeout)
  }, [])

  const derived = useMemo(() => deriveAuthState(state.user, state.profile), [state.user, state.profile])

  const signIn = useCallback(
    (email: string, password: string) => managerRef.current!.signIn(email, password),
    []
  )

  const signOut = useCallback(
    (db?: unknown) => managerRef.current!.signOut(db),
    []
  )

  const refreshProfile = useCallback(
    () => managerRef.current!.refreshProfile(),
    []
  )

  const value = useMemo<AuthContextValue>(() => ({
    ...state,
    ...derived,
    signIn,
    signOut,
    refreshProfile,
  }), [state, derived, signIn, signOut, refreshProfile])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
