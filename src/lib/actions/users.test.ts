import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deactivateUser,
  activateUser,
  updateUserRole,
} from './users'
import type { Profile, UserRole } from '@/lib/supabase/types'

// Mock the server client
const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockEq = vi.fn()
const mockSingle = vi.fn()
const mockOrder = vi.fn()

const mockFrom = vi.fn(() => ({
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
}))

const mockAdminCreateUser = vi.fn()
const mockAdminDeleteUser = vi.fn()

const mockSupabaseClient = {
  from: mockFrom,
  auth: {
    getUser: vi.fn(),
    admin: {
      createUser: mockAdminCreateUser,
      deleteUser: mockAdminDeleteUser,
    },
  },
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
}))

// Sample profile data (with all required fields)
const sampleProfile: Profile = {
  id: 'user-1',
  username: 'johndoe',
  email: 'john@example.com',
  first_name: 'John',
  last_name: 'Doe',
  name: 'John Doe',
  role: 'employee',
  avatar_url: null,
  is_active: true,
  created_by: null,
  created_at: '2024-01-01T00:00:00Z',
  last_login_at: '2024-01-15T10:00:00Z',
}

const adminProfile: Profile = {
  ...sampleProfile,
  id: 'admin-1',
  username: 'admin',
  email: 'admin@example.com',
  role: 'admin',
}

describe('users actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default: current user is admin
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'admin-1' } },
      error: null,
    })

    // Reset mock chain
    mockSelect.mockReturnValue({
      eq: mockEq,
      order: mockOrder,
    })
    mockEq.mockReturnValue({
      eq: mockEq,
      single: mockSingle,
    })
    mockOrder.mockReturnValue({
      eq: mockEq,
    })
    mockUpdate.mockReturnValue({
      eq: mockEq,
    })
  })

  describe('getUsers', () => {
    it('returns all users when admin', async () => {
      const profiles = [sampleProfile, adminProfile]
      // Mock admin check
      mockSingle.mockResolvedValueOnce({ data: adminProfile, error: null })
      // Mock get all users
      mockOrder.mockResolvedValueOnce({ data: profiles, error: null })

      const result = await getUsers()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(profiles)
      }
      expect(mockFrom).toHaveBeenCalledWith('profiles')
    })

    it('returns error when not admin', async () => {
      // Mock admin check returns non-admin
      const employeeProfile = { ...sampleProfile, role: 'employee' as UserRole }
      mockSingle.mockResolvedValueOnce({ data: employeeProfile, error: null })

      const result = await getUsers()

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Admin access required')
      }
    })

    it('returns error when query fails', async () => {
      mockSingle.mockResolvedValueOnce({ data: adminProfile, error: null })
      mockOrder.mockResolvedValueOnce({ data: null, error: { message: 'Database error' } })

      const result = await getUsers()

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Database error')
      }
    })

    it('returns error when user not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      })

      const result = await getUsers()

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('User not authenticated')
      }
    })
  })

  describe('getUserById', () => {
    it('returns user profile when admin', async () => {
      // Mock admin check
      mockSingle.mockResolvedValueOnce({ data: adminProfile, error: null })
      // Mock get user
      mockSingle.mockResolvedValueOnce({ data: sampleProfile, error: null })

      const result = await getUserById('user-1')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(sampleProfile)
      }
      expect(mockEq).toHaveBeenCalledWith('id', 'user-1')
    })

    it('returns error when not admin', async () => {
      const employeeProfile = { ...sampleProfile, role: 'employee' as UserRole }
      mockSingle.mockResolvedValueOnce({ data: employeeProfile, error: null })

      const result = await getUserById('user-2')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Admin access required')
      }
    })

    it('returns error when user not found', async () => {
      mockSingle.mockResolvedValueOnce({ data: adminProfile, error: null })
      mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'Not found' } })

      const result = await getUserById('invalid-id')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Not found')
      }
    })
  })

  describe('createUser', () => {
    it('creates a new user successfully when admin', async () => {
      const newUser = { id: 'new-user-1', email: 'new@example.com' }
      const newProfile = { ...sampleProfile, id: 'new-user-1', email: 'new@example.com' }

      // Mock admin check
      mockSingle.mockResolvedValueOnce({ data: adminProfile, error: null })
      // Mock Supabase admin create user
      mockAdminCreateUser.mockResolvedValueOnce({ data: { user: newUser }, error: null })
      // Mock profile insert
      mockSingle.mockResolvedValueOnce({ data: newProfile, error: null })
      mockInsert.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValueOnce({ data: newProfile, error: null }),
        }),
      })

      const result = await createUser({
        username: 'newuser',
        email: 'new@example.com',
        password: 'securePassword123',
        firstName: 'New',
        lastName: 'User',
        role: 'employee',
      })

      expect(result.success).toBe(true)
      expect(mockAdminCreateUser).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'securePassword123',
        email_confirm: true,
      })
    })

    it('returns error when not admin', async () => {
      const employeeProfile = { ...sampleProfile, role: 'employee' as UserRole }
      mockSingle.mockResolvedValueOnce({ data: employeeProfile, error: null })

      const result = await createUser({
        username: 'newuser',
        email: 'new@example.com',
        password: 'securePassword123',
        firstName: 'New',
        lastName: 'User',
        role: 'employee',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Admin access required')
      }
    })

    it('returns error when auth creation fails', async () => {
      mockSingle.mockResolvedValueOnce({ data: adminProfile, error: null })
      mockAdminCreateUser.mockResolvedValueOnce({
        data: null,
        error: { message: 'Email already exists' },
      })

      const result = await createUser({
        username: 'existinguser',
        email: 'existing@example.com',
        password: 'securePassword123',
        firstName: 'New',
        lastName: 'User',
        role: 'employee',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Email already exists')
      }
    })
  })

  describe('updateUser', () => {
    it('updates user profile when admin', async () => {
      const updatedProfile = { ...sampleProfile, first_name: 'Jane' }

      // Mock admin check
      mockSingle.mockResolvedValueOnce({ data: adminProfile, error: null })
      // Mock update
      mockSingle.mockResolvedValueOnce({ data: updatedProfile, error: null })
      mockUpdate.mockReturnValueOnce({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValueOnce({ data: updatedProfile, error: null }),
          }),
        }),
      })

      const result = await updateUser('user-1', { first_name: 'Jane' })

      expect(result.success).toBe(true)
    })

    it('returns error when not admin', async () => {
      const employeeProfile = { ...sampleProfile, role: 'employee' as UserRole }
      mockSingle.mockResolvedValueOnce({ data: employeeProfile, error: null })

      const result = await updateUser('user-1', { first_name: 'Jane' })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Admin access required')
      }
    })

    it('returns error when update fails', async () => {
      mockSingle.mockResolvedValueOnce({ data: adminProfile, error: null })
      mockUpdate.mockReturnValueOnce({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValueOnce({
              data: null,
              error: { message: 'Update failed' },
            }),
          }),
        }),
      })

      const result = await updateUser('user-1', { first_name: 'Jane' })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Update failed')
      }
    })
  })

  describe('deactivateUser', () => {
    it('deactivates user when admin', async () => {
      const deactivatedProfile = { ...sampleProfile, is_active: false }

      // Mock admin check
      mockSingle.mockResolvedValueOnce({ data: adminProfile, error: null })
      // Mock update
      mockUpdate.mockReturnValueOnce({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValueOnce({ data: deactivatedProfile, error: null }),
          }),
        }),
      })

      const result = await deactivateUser('user-1')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data?.is_active).toBe(false)
      }
    })

    it('returns error when not admin', async () => {
      const employeeProfile = { ...sampleProfile, role: 'employee' as UserRole }
      mockSingle.mockResolvedValueOnce({ data: employeeProfile, error: null })

      const result = await deactivateUser('user-1')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Admin access required')
      }
    })

    it('prevents deactivating own account', async () => {
      mockSingle.mockResolvedValueOnce({ data: adminProfile, error: null })

      const result = await deactivateUser('admin-1')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Cannot deactivate your own account')
      }
    })
  })

  describe('activateUser', () => {
    it('activates user when admin', async () => {
      const activatedProfile = { ...sampleProfile, is_active: true }

      // Mock admin check
      mockSingle.mockResolvedValueOnce({ data: adminProfile, error: null })
      // Mock update
      mockUpdate.mockReturnValueOnce({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValueOnce({ data: activatedProfile, error: null }),
          }),
        }),
      })

      const result = await activateUser('user-1')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data?.is_active).toBe(true)
      }
    })

    it('returns error when not admin', async () => {
      const employeeProfile = { ...sampleProfile, role: 'employee' as UserRole }
      mockSingle.mockResolvedValueOnce({ data: employeeProfile, error: null })

      const result = await activateUser('user-1')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Admin access required')
      }
    })
  })

  describe('updateUserRole', () => {
    it('updates user role when admin', async () => {
      const updatedProfile = { ...sampleProfile, role: 'admin' as UserRole }

      // Mock admin check
      mockSingle.mockResolvedValueOnce({ data: adminProfile, error: null })
      // Mock update
      mockUpdate.mockReturnValueOnce({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValueOnce({ data: updatedProfile, error: null }),
          }),
        }),
      })

      const result = await updateUserRole('user-1', 'admin')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data?.role).toBe('admin')
      }
    })

    it('returns error when not admin', async () => {
      const employeeProfile = { ...sampleProfile, role: 'employee' as UserRole }
      mockSingle.mockResolvedValueOnce({ data: employeeProfile, error: null })

      const result = await updateUserRole('user-1', 'admin')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Admin access required')
      }
    })

    it('prevents changing own role', async () => {
      mockSingle.mockResolvedValueOnce({ data: adminProfile, error: null })

      const result = await updateUserRole('admin-1', 'employee')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Cannot change your own role')
      }
    })

    it('validates role value', async () => {
      mockSingle.mockResolvedValueOnce({ data: adminProfile, error: null })

      // @ts-expect-error Testing invalid role
      const result = await updateUserRole('user-1', 'superadmin')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Invalid role')
      }
    })
  })
})
