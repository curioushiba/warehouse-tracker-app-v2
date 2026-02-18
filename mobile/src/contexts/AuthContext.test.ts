import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Mocks ---

const mockSignInWithPassword = vi.fn()
const mockSignOut = vi.fn()
const mockGetUser = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockSingle = vi.fn()
const mockFrom = vi.fn(() => ({ select: mockSelect }))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signOut: mockSignOut,
      getUser: mockGetUser,
    },
    from: mockFrom,
  }),
}))

const mockSetSessionToken = vi.fn()
const mockGetSessionToken = vi.fn()
const mockClearSession = vi.fn()

vi.mock('@/lib/storage/storage', () => ({
  setSessionToken: (...args: unknown[]) => mockSetSessionToken(...args),
  getSessionToken: () => mockGetSessionToken(),
  clearSession: () => mockClearSession(),
}))

const mockClearQueue = vi.fn()
const mockClearItemEditQueue = vi.fn()
const mockClearItemCreateQueue = vi.fn()
const mockClearItemArchiveQueue = vi.fn()

vi.mock('@/lib/db/transaction-queue', () => ({
  clearQueue: (...args: unknown[]) => mockClearQueue(...args),
}))
vi.mock('@/lib/db/item-edit-queue', () => ({
  clearItemEditQueue: (...args: unknown[]) => mockClearItemEditQueue(...args),
}))
vi.mock('@/lib/db/item-create-queue', () => ({
  clearItemCreateQueue: (...args: unknown[]) => mockClearItemCreateQueue(...args),
}))
vi.mock('@/lib/db/item-archive-queue', () => ({
  clearItemArchiveQueue: (...args: unknown[]) => mockClearItemArchiveQueue(...args),
}))

import { deriveAuthState, createAuthManager, type AuthState } from './AuthContext'

// --- Tests ---

describe('deriveAuthState', () => {
  it('returns isAuthenticated=true when user is non-null', () => {
    const result = deriveAuthState({ id: 'u1', email: 'a@b.com' }, null)
    expect(result.isAuthenticated).toBe(true)
  })

  it('returns isAuthenticated=false when user is null', () => {
    const result = deriveAuthState(null, null)
    expect(result.isAuthenticated).toBe(false)
  })

  it('returns isAdmin=true when profile role is admin', () => {
    const result = deriveAuthState(
      { id: 'u1', email: 'a@b.com' },
      { role: 'admin', is_active: true } as never
    )
    expect(result.isAdmin).toBe(true)
    expect(result.isEmployee).toBe(false)
  })

  it('returns isEmployee=true when profile role is employee', () => {
    const result = deriveAuthState(
      { id: 'u1', email: 'a@b.com' },
      { role: 'employee', is_active: true } as never
    )
    expect(result.isEmployee).toBe(true)
    expect(result.isAdmin).toBe(false)
  })

  it('returns isActive=true when profile is_active is true', () => {
    const result = deriveAuthState(
      { id: 'u1', email: 'a@b.com' },
      { role: 'employee', is_active: true } as never
    )
    expect(result.isActive).toBe(true)
  })

  it('returns isActive=false when profile is_active is false', () => {
    const result = deriveAuthState(
      { id: 'u1', email: 'a@b.com' },
      { role: 'employee', is_active: false } as never
    )
    expect(result.isActive).toBe(false)
  })

  it('returns all false when user and profile are null', () => {
    const result = deriveAuthState(null, null)
    expect(result).toEqual({
      isAuthenticated: false,
      isAdmin: false,
      isEmployee: false,
      isActive: false,
    })
  })
})

describe('createAuthManager', () => {
  let state: AuthState
  let setState: (partial: Partial<AuthState>) => void
  let getState: () => AuthState

  beforeEach(() => {
    vi.clearAllMocks()
    state = { user: null, profile: null, isLoading: false }
    setState = (partial) => { state = { ...state, ...partial } }
    getState = () => state

    // Default Supabase chain mock
    mockSelect.mockReturnValue({ eq: mockEq })
    mockEq.mockReturnValue({ single: mockSingle })
    mockSingle.mockResolvedValue({ data: null, error: null })
  })

  // --- signIn ---

  describe('signIn', () => {
    it('sets user and profile on success', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: {
          user: { id: 'u1', email: 'test@test.com' },
          session: { access_token: 'token-123' },
        },
        error: null,
      })
      mockSingle.mockResolvedValue({
        data: { id: 'u1', role: 'employee', is_active: true },
        error: null,
      })

      const manager = createAuthManager(setState, getState)
      const result = await manager.signIn('test@test.com', 'password')

      expect(result.error).toBeNull()
      expect(state.user).toEqual({ id: 'u1', email: 'test@test.com' })
      expect(state.profile).toEqual({ id: 'u1', role: 'employee', is_active: true })
      expect(state.isLoading).toBe(false)
    })

    it('stores session token on success', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: {
          user: { id: 'u1', email: 'test@test.com' },
          session: { access_token: 'my-token' },
        },
        error: null,
      })
      mockSingle.mockResolvedValue({ data: { id: 'u1' }, error: null })

      const manager = createAuthManager(setState, getState)
      await manager.signIn('test@test.com', 'password')

      expect(mockSetSessionToken).toHaveBeenCalledWith('my-token')
    })

    it('returns error message on failure', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid credentials' },
      })

      const manager = createAuthManager(setState, getState)
      const result = await manager.signIn('bad@test.com', 'wrong')

      expect(result.error).toBe('Invalid credentials')
      expect(state.user).toBeNull()
      expect(state.isLoading).toBe(false)
    })

    it('returns default error when user is null without error', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      })

      const manager = createAuthManager(setState, getState)
      const result = await manager.signIn('a@b.com', 'x')

      expect(result.error).toBe('Sign in failed')
    })

    it('sets isLoading=true during signIn', async () => {
      let loadingDuringCall = false
      const trackSetState = (partial: Partial<AuthState>) => {
        state = { ...state, ...partial }
        if (partial.isLoading === true) loadingDuringCall = true
      }
      mockSignInWithPassword.mockResolvedValue({
        data: { user: { id: 'u1', email: 'a@b.com' }, session: { access_token: 't' } },
        error: null,
      })
      mockSingle.mockResolvedValue({ data: { id: 'u1' }, error: null })

      const manager = createAuthManager(trackSetState, getState)
      await manager.signIn('a@b.com', 'p')

      expect(loadingDuringCall).toBe(true)
    })
  })

  // --- signOut ---

  describe('signOut', () => {
    it('clears state and session', async () => {
      state = {
        user: { id: 'u1', email: 'a@b.com' },
        profile: { role: 'employee', is_active: true } as never,
        isLoading: false,
      }
      mockSignOut.mockResolvedValue({ error: null })

      const manager = createAuthManager(setState, getState)
      await manager.signOut()

      expect(state.user).toBeNull()
      expect(state.profile).toBeNull()
      expect(state.isLoading).toBe(false)
      expect(mockClearSession).toHaveBeenCalled()
      expect(mockSignOut).toHaveBeenCalled()
    })

    it('clears SQLite queues when db provided', async () => {
      mockSignOut.mockResolvedValue({ error: null })
      const fakeDb = { runSync: vi.fn() }

      const manager = createAuthManager(setState, getState)
      await manager.signOut(fakeDb)

      expect(mockClearQueue).toHaveBeenCalledWith(fakeDb)
      expect(mockClearItemEditQueue).toHaveBeenCalledWith(fakeDb)
      expect(mockClearItemCreateQueue).toHaveBeenCalledWith(fakeDb)
      expect(mockClearItemArchiveQueue).toHaveBeenCalledWith(fakeDb)
    })

    it('does not clear SQLite queues when db is not provided', async () => {
      mockSignOut.mockResolvedValue({ error: null })

      const manager = createAuthManager(setState, getState)
      await manager.signOut()

      expect(mockClearQueue).not.toHaveBeenCalled()
      expect(mockClearItemEditQueue).not.toHaveBeenCalled()
    })

    it('ignores errors during queue cleanup', async () => {
      mockSignOut.mockResolvedValue({ error: null })
      mockClearQueue.mockImplementation(() => { throw new Error('DB error') })
      const fakeDb = {}

      const manager = createAuthManager(setState, getState)
      // Should not throw
      await expect(manager.signOut(fakeDb)).resolves.toBeUndefined()
      expect(mockClearSession).toHaveBeenCalled()
    })
  })

  // --- refreshProfile ---

  describe('refreshProfile', () => {
    it('updates profile when user exists', async () => {
      state = {
        user: { id: 'u1', email: 'a@b.com' },
        profile: { role: 'employee', is_active: true } as never,
        isLoading: false,
      }
      mockSingle.mockResolvedValue({
        data: { id: 'u1', role: 'admin', is_active: true },
        error: null,
      })

      const manager = createAuthManager(setState, getState)
      await manager.refreshProfile()

      expect(state.profile).toEqual({ id: 'u1', role: 'admin', is_active: true })
    })

    it('does nothing when no user', async () => {
      state = { user: null, profile: null, isLoading: false }

      const manager = createAuthManager(setState, getState)
      await manager.refreshProfile()

      expect(mockFrom).not.toHaveBeenCalled()
    })

    it('does not clear profile on fetch error', async () => {
      const originalProfile = { role: 'employee', is_active: true } as never
      state = {
        user: { id: 'u1', email: 'a@b.com' },
        profile: originalProfile,
        isLoading: false,
      }
      mockSingle.mockResolvedValue({ data: null, error: { message: 'DB error' } })

      const manager = createAuthManager(setState, getState)
      await manager.refreshProfile()

      // Profile should remain unchanged (null data means no update)
      expect(state.profile).toBe(originalProfile)
    })
  })

  // --- restoreSession ---

  describe('restoreSession', () => {
    it('restores user and profile from valid token', async () => {
      mockGetSessionToken.mockReturnValue('valid-token')
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'u1', email: 'restored@test.com' } },
        error: null,
      })
      mockSingle.mockResolvedValue({
        data: { id: 'u1', role: 'employee', is_active: true },
        error: null,
      })

      const manager = createAuthManager(setState, getState)
      await manager.restoreSession()

      expect(state.user).toEqual({ id: 'u1', email: 'restored@test.com' })
      expect(state.profile).toEqual({ id: 'u1', role: 'employee', is_active: true })
      expect(state.isLoading).toBe(false)
    })

    it('clears session when no token stored', async () => {
      mockGetSessionToken.mockReturnValue(undefined)

      const manager = createAuthManager(setState, getState)
      await manager.restoreSession()

      expect(state.user).toBeNull()
      expect(state.isLoading).toBe(false)
      expect(mockGetUser).not.toHaveBeenCalled()
    })

    it('clears session when getUser returns null', async () => {
      mockGetSessionToken.mockReturnValue('some-token')
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const manager = createAuthManager(setState, getState)
      await manager.restoreSession()

      expect(state.user).toBeNull()
      expect(state.profile).toBeNull()
      expect(mockClearSession).toHaveBeenCalled()
    })

    it('clears session on auth error', async () => {
      mockGetSessionToken.mockReturnValue('bad-token')
      mockGetUser.mockRejectedValue(new Error('Network error'))

      const manager = createAuthManager(setState, getState)
      await manager.restoreSession()

      expect(state.user).toBeNull()
      expect(state.profile).toBeNull()
      expect(mockClearSession).toHaveBeenCalled()
      expect(state.isLoading).toBe(false)
    })

    it('sets isLoading=true at start', async () => {
      let loadingAtStart = false
      const trackSetState = (partial: Partial<AuthState>) => {
        state = { ...state, ...partial }
        if (partial.isLoading === true) loadingAtStart = true
      }
      mockGetSessionToken.mockReturnValue(undefined)

      const manager = createAuthManager(trackSetState, () => state)
      await manager.restoreSession()

      expect(loadingAtStart).toBe(true)
    })
  })
})
