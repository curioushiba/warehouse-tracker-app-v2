'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { verifyAttendanceCredentials, getAttendanceEmployee } from '@/lib/actions/attendance/auth'

// ============================================
// TYPES
// ============================================
interface AttendanceEmployee {
  id: string
  username: string
  display_name: string
}

interface AttendanceAuthContextType {
  employee: AttendanceEmployee | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
}

// ============================================
// CONSTANTS
// ============================================
const STORAGE_KEY = 'att_employee_session'
const SESSION_DURATION_DAYS = 30

// ============================================
// CONTEXT
// ============================================
const AttendanceAuthContext = createContext<AttendanceAuthContextType | undefined>(undefined)

// ============================================
// PROVIDER
// ============================================
interface AttendanceAuthProviderProps {
  children: ReactNode
}

export function AttendanceAuthProvider({ children }: AttendanceAuthProviderProps) {
  const [employee, setEmployee] = useState<AttendanceEmployee | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load session from localStorage on mount
  useEffect(() => {
    const loadSession = async () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (!stored) {
          setIsLoading(false)
          return
        }

        const session = JSON.parse(stored) as {
          employee: AttendanceEmployee
          expiresAt: number
        }

        // Check if session expired
        if (Date.now() > session.expiresAt) {
          localStorage.removeItem(STORAGE_KEY)
          setIsLoading(false)
          return
        }

        // Validate employee still exists and is active
        const result = await getAttendanceEmployee(session.employee.id)
        if (result.success && result.data && result.data.is_active) {
          setEmployee({
            id: result.data.id,
            username: result.data.username,
            display_name: result.data.display_name,
          })
        } else {
          // Employee no longer valid, clear session
          localStorage.removeItem(STORAGE_KEY)
        }
      } catch (err) {
        console.error('Failed to load attendance session:', err)
        localStorage.removeItem(STORAGE_KEY)
      } finally {
        setIsLoading(false)
      }
    }

    loadSession()
  }, [])

  // Login function
  const login = useCallback(async (username: string, password: string) => {
    try {
      const result = await verifyAttendanceCredentials(username, password)

      if (!result.success) {
        return { success: false, error: result.error }
      }

      const credResult = result.data
      if (!credResult.success) {
        return { success: false, error: credResult.error ?? 'Invalid credentials' }
      }

      const emp = credResult.employee!

      // Store session
      const session = {
        employee: emp,
        expiresAt: Date.now() + (SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000),
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session))

      setEmployee(emp)
      return { success: true }
    } catch {
      return { success: false, error: 'Login failed' }
    }
  }, [])

  // Logout function
  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setEmployee(null)
  }, [])

  const value: AttendanceAuthContextType = {
    employee,
    isLoading,
    isAuthenticated: !!employee,
    login,
    logout,
  }

  return (
    <AttendanceAuthContext.Provider value={value}>
      {children}
    </AttendanceAuthContext.Provider>
  )
}

// ============================================
// HOOK
// ============================================
export function useAttendanceAuth() {
  const context = useContext(AttendanceAuthContext)
  if (context === undefined) {
    throw new Error('useAttendanceAuth must be used within an AttendanceAuthProvider')
  }
  return context
}
