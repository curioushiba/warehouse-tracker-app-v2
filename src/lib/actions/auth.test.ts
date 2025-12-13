import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest'

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Mock next/navigation
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase/server'
import {
  signIn,
  signOut,
  getCurrentUser,
  updateLastLogin,
  requestPasswordReset,
  updatePassword,
} from './auth'
import type { Profile } from '@/lib/supabase/types'

describe('Auth Server Actions', () => {
  let mockSupabase: {
    auth: {
      signInWithPassword: Mock
      signOut: Mock
      getUser: Mock
      resetPasswordForEmail: Mock
      updateUser: Mock
    }
    from: Mock
  }

  beforeEach(() => {
    vi.clearAllMocks()

    mockSupabase = {
      auth: {
        signInWithPassword: vi.fn(),
        signOut: vi.fn(),
        getUser: vi.fn(),
        resetPasswordForEmail: vi.fn(),
        updateUser: vi.fn(),
      },
      from: vi.fn(),
    }

    ;(createClient as Mock).mockResolvedValue(mockSupabase)
  })

  describe('signIn', () => {
    it('should sign in user successfully with valid credentials', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      }

      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: { access_token: 'token' } },
        error: null,
      })

      const result = await signIn('test@example.com', 'password123')

      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })
      expect(result).toEqual({
        success: true,
        data: { user: mockUser, session: { access_token: 'token' } },
      })
    })

    it('should return error for invalid credentials', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      })

      const result = await signIn('test@example.com', 'wrongpassword')

      expect(result).toEqual({
        success: false,
        error: 'Invalid login credentials',
      })
    })

    it('should handle network errors gracefully', async () => {
      mockSupabase.auth.signInWithPassword.mockRejectedValue(
        new Error('Network error')
      )

      const result = await signIn('test@example.com', 'password123')

      expect(result).toEqual({
        success: false,
        error: 'Network error',
      })
    })
  })

  describe('signOut', () => {
    it('should sign out user successfully', async () => {
      mockSupabase.auth.signOut.mockResolvedValue({
        error: null,
      })

      const result = await signOut()

      expect(mockSupabase.auth.signOut).toHaveBeenCalled()
      expect(result).toEqual({
        success: true,
      })
    })

    it('should return error when sign out fails', async () => {
      mockSupabase.auth.signOut.mockResolvedValue({
        error: { message: 'Session not found' },
      })

      const result = await signOut()

      expect(result).toEqual({
        success: false,
        error: 'Session not found',
      })
    })

    it('should handle network errors during sign out', async () => {
      mockSupabase.auth.signOut.mockRejectedValue(
        new Error('Network error')
      )

      const result = await signOut()

      expect(result).toEqual({
        success: false,
        error: 'Network error',
      })
    })
  })

  describe('getCurrentUser', () => {
    const mockProfile: Profile = {
      id: 'user-123',
      username: 'johndoe',
      email: 'test@example.com',
      first_name: 'John',
      last_name: 'Doe',
      name: 'John Doe',
      role: 'employee',
      avatar_url: null,
      is_active: true,
      created_by: null,
      created_at: '2024-01-01T00:00:00Z',
      last_login_at: null,
    }

    it('should return user with profile when authenticated', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      }

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockProfile,
            error: null,
          }),
        }),
      })

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      })

      const result = await getCurrentUser()

      expect(mockSupabase.auth.getUser).toHaveBeenCalled()
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles')
      expect(result).toEqual({
        success: true,
        data: {
          user: mockUser,
          profile: mockProfile,
        },
      })
    })

    it('should return null when no user is authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const result = await getCurrentUser()

      expect(result).toEqual({
        success: true,
        data: null,
      })
    })

    it('should return error when auth check fails', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Session expired' },
      })

      const result = await getCurrentUser()

      expect(result).toEqual({
        success: false,
        error: 'Session expired',
      })
    })

    it('should return user without profile if profile fetch fails', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      }

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Profile not found' },
          }),
        }),
      })

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      })

      const result = await getCurrentUser()

      expect(result).toEqual({
        success: true,
        data: {
          user: mockUser,
          profile: null,
        },
      })
    })
  })

  describe('updateLastLogin', () => {
    it('should update last login timestamp successfully', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          error: null,
        }),
      })

      mockSupabase.from.mockReturnValue({
        update: mockUpdate,
      })

      const result = await updateLastLogin('user-123')

      expect(mockSupabase.from).toHaveBeenCalledWith('profiles')
      expect(mockUpdate).toHaveBeenCalledWith({
        last_login_at: expect.any(String),
      })
      expect(result).toEqual({
        success: true,
      })
    })

    it('should return error when update fails', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          error: { message: 'User not found' },
        }),
      })

      mockSupabase.from.mockReturnValue({
        update: mockUpdate,
      })

      const result = await updateLastLogin('invalid-user')

      expect(result).toEqual({
        success: false,
        error: 'User not found',
      })
    })

    it('should handle network errors during update', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockRejectedValue(new Error('Network error')),
      })

      mockSupabase.from.mockReturnValue({
        update: mockUpdate,
      })

      const result = await updateLastLogin('user-123')

      expect(result).toEqual({
        success: false,
        error: 'Network error',
      })
    })
  })

  describe('requestPasswordReset', () => {
    it('should send password reset email successfully', async () => {
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
        data: {},
        error: null,
      })

      const result = await requestPasswordReset('test@example.com')

      expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'test@example.com',
        {
          redirectTo: expect.stringContaining('/auth/reset-password'),
        }
      )
      expect(result).toEqual({
        success: true,
      })
    })

    it('should return error when reset request fails', async () => {
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
        data: null,
        error: { message: 'Email not found' },
      })

      const result = await requestPasswordReset('nonexistent@example.com')

      expect(result).toEqual({
        success: false,
        error: 'Email not found',
      })
    })

    it('should handle network errors during password reset request', async () => {
      mockSupabase.auth.resetPasswordForEmail.mockRejectedValue(
        new Error('Network error')
      )

      const result = await requestPasswordReset('test@example.com')

      expect(result).toEqual({
        success: false,
        error: 'Network error',
      })
    })
  })

  describe('updatePassword', () => {
    it('should update password successfully', async () => {
      mockSupabase.auth.updateUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      const result = await updatePassword('newSecurePassword123')

      expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
        password: 'newSecurePassword123',
      })
      expect(result).toEqual({
        success: true,
      })
    })

    it('should return error when password update fails', async () => {
      mockSupabase.auth.updateUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Password is too weak' },
      })

      const result = await updatePassword('weak')

      expect(result).toEqual({
        success: false,
        error: 'Password is too weak',
      })
    })

    it('should handle network errors during password update', async () => {
      mockSupabase.auth.updateUser.mockRejectedValue(
        new Error('Network error')
      )

      const result = await updatePassword('newSecurePassword123')

      expect(result).toEqual({
        success: false,
        error: 'Network error',
      })
    })
  })
})
