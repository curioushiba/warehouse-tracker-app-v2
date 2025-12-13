'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/lib/supabase/types'

interface AuthState {
  user: User | null
  profile: Profile | null
  isLoading: boolean
  isAuthenticated: boolean
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    isLoading: true,
    isAuthenticated: false,
  })

  useEffect(() => {
    // Get singleton Supabase client inside useEffect
    const supabase = createClient()

    const fetchProfile = async (userId: string): Promise<Profile | null> => {
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()
        
        if (error) {
          console.error('[useAuth] Error fetching profile:', error)
          return null
        }
        
        return profile
      } catch (error) {
        console.error('[useAuth] Exception fetching profile:', error)
        return null
      }
    }

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()

        if (userError) {
          console.error('[useAuth] Error getting user:', userError)
          setState({
            user: null,
            profile: null,
            isLoading: false,
            isAuthenticated: false,
          })
          return
        }

        if (user) {
          const profile = await fetchProfile(user.id)
          setState({
            user,
            profile,
            isLoading: false,
            isAuthenticated: true,
          })
        } else {
          setState({
            user: null,
            profile: null,
            isLoading: false,
            isAuthenticated: false,
          })
        }
      } catch (error) {
        console.error('[useAuth] Exception in getInitialSession:', error)
        setState({
          user: null,
          profile: null,
          isLoading: false,
          isAuthenticated: false,
        })
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          if (session?.user) {
            const profile = await fetchProfile(session.user.id)
            setState({
              user: session.user,
              profile,
              isLoading: false,
              isAuthenticated: true,
            })
          } else {
            setState({
              user: null,
              profile: null,
              isLoading: false,
              isAuthenticated: false,
            })
          }
        } catch (error) {
          console.error('[useAuth] Exception in auth state change:', error)
          setState({
            user: session?.user ?? null,
            profile: null,
            isLoading: false,
            isAuthenticated: !!session?.user,
          })
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signOut = useCallback(async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
  }, [])

  return {
    ...state,
    signOut,
    isAdmin: state.profile?.role === 'admin',
    isEmployee: state.profile?.role === 'employee',
    isActive: state.profile?.is_active ?? false,
  }
}
