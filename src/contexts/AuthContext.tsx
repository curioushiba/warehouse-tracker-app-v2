'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
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
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/1cdebf1c-046d-413a-a7aa-3fb720f110d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:32',message:'fetchProfile entry',data:{userId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (error) {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/1cdebf1c-046d-413a-a7aa-3fb720f110d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:40',message:'fetchProfile error',data:{error:error.message,code:error.code},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
        // #endregion
        console.error('[AuthContext] Error fetching profile:', error)
        return null
      }
      
      if (data) {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/1cdebf1c-046d-413a-a7aa-3fb720f110d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:45',message:'fetchProfile success',data:{hasData:!!data,role:data?.role},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
        // #endregion
        console.log('[AuthContext] Fetched profile:', {
          id: data.id,
          name: data.name,
          first_name: data.first_name,
          last_name: data.last_name,
          username: data.username,
          email: data.email,
        })
      }
      
      return data as Profile | null
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/1cdebf1c-046d-413a-a7aa-3fb720f110d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:58',message:'fetchProfile exception',data:{error:error instanceof Error?error.message:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
      // #endregion
      console.error('[AuthContext] Exception fetching profile:', error)
      return null
    }
  }

  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchProfile(user.id)
      setProfile(profileData)
    }
  }

  useEffect(() => {
    let isMounted = true
    let authStateChangeHandled = false

    // Get initial session with timeout fallback
    const initializeAuth = async () => {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/1cdebf1c-046d-413a-a7aa-3fb720f110d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:84',message:'initializeAuth started',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
      // #endregion
      console.log('[AuthContext] Starting initializeAuth...')
      console.log('[AuthContext] Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30))
      
      // Add timeout to prevent infinite hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('getSession timeout after 5s')), 5000)
      )
      
      try {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/1cdebf1c-046d-413a-a7aa-3fb720f110d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:94',message:'Calling getSession',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
        // #endregion
        console.log('[AuthContext] Calling getSession...')
        const result = await Promise.race([
          supabase.auth.getSession(),
          timeoutPromise
        ]) as Awaited<ReturnType<typeof supabase.auth.getSession>>
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/1cdebf1c-046d-413a-a7aa-3fb720f110d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:99',message:'getSession returned',data:{hasSession:!!result.data?.session,hasUser:!!result.data?.session?.user,hasError:!!result.error,error:result.error?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
        // #endregion
        console.log('[AuthContext] getSession returned:', result)
        const initialSession = result.data?.session
        console.log('[AuthContext] Got session:', !!initialSession?.user)

        if (initialSession?.user && isMounted) {
          setSession(initialSession)
          setUser(initialSession.user)
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/1cdebf1c-046d-413a-a7aa-3fb720f110d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:107',message:'Calling fetchProfile',data:{userId:initialSession.user.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
          // #endregion
          const profileData = await fetchProfile(initialSession.user.id)
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/1cdebf1c-046d-413a-a7aa-3fb720f110d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:109',message:'fetchProfile returned',data:{hasProfile:!!profileData,role:profileData?.role},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
          // #endregion
          console.log('[AuthContext] Got profile:', profileData?.role)
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
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/1cdebf1c-046d-413a-a7aa-3fb720f110d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:123',message:'Error in initializeAuth',data:{error:error instanceof Error?error.message:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1,H2'})}).catch(()=>{});
        // #endregion
        console.error('[AuthContext] Error initializing auth:', error)
        // If getSession timed out but onAuthStateChange hasn't fired yet, wait for it
        // Otherwise, set loading to false to prevent infinite loading
        if (error instanceof Error && error.message.includes('timeout') && !authStateChangeHandled) {
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/1cdebf1c-046d-413a-a7aa-3fb720f110d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:128',message:'getSession timeout, waiting for onAuthStateChange',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
          // #endregion
          // Wait a bit for onAuthStateChange to fire, then set loading to false
          setTimeout(() => {
            if (isMounted && !authStateChangeHandled) {
              // #region agent log
              fetch('http://127.0.0.1:7243/ingest/1cdebf1c-046d-413a-a7aa-3fb720f110d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:132',message:'Timeout fallback: setting isLoading to false',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
              // #endregion
              setIsLoading(false)
            }
          }, 2000)
          return
        }
      } finally {
        if (isMounted) {
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/1cdebf1c-046d-413a-a7aa-3fb720f110d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:140',message:'Setting isLoading to false',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1,H2,H4'})}).catch(()=>{});
          // #endregion
          console.log('[AuthContext] Setting isLoading to false')
          setIsLoading(false)
        }
      }
    }

    initializeAuth()

    // Listen for auth state changes - this is more reliable than getSession
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/1cdebf1c-046d-413a-a7aa-3fb720f110d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:149',message:'onAuthStateChange fired',data:{event,hasSession:!!newSession,hasUser:!!newSession?.user},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3'})}).catch(()=>{});
        // #endregion
        authStateChangeHandled = true
        if (isMounted) {
          setSession(newSession)
          setUser(newSession?.user ?? null)

          if (newSession?.user) {
            // #region agent log
            fetch('http://127.0.0.1:7243/ingest/1cdebf1c-046d-413a-a7aa-3fb720f110d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:156',message:'onAuthStateChange: calling fetchProfile',data:{userId:newSession.user.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
            // #endregion
            const profileData = await fetchProfile(newSession.user.id)
            // #region agent log
            fetch('http://127.0.0.1:7243/ingest/1cdebf1c-046d-413a-a7aa-3fb720f110d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:158',message:'onAuthStateChange: fetchProfile returned',data:{hasProfile:!!profileData,role:profileData?.role},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
            // #endregion
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

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setSession(null)
  }

  const value: AuthContextType = {
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
  }

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
