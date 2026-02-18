import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createSyncErrorCountFetcher,
  type SyncErrorCountState,
} from './useSyncErrorCount'

/**
 * useSyncErrorCount is a React hook wrapping a Supabase query for pending sync errors.
 * We test the pure fetch logic via createSyncErrorCountFetcher().
 *
 * We create a manual mock of the Supabase client interface rather than
 * mocking the module, since createSyncErrorCountFetcher accepts an optional client.
 */
describe('createSyncErrorCountFetcher', () => {
  let state: SyncErrorCountState
  let setState: (partial: Partial<SyncErrorCountState>) => void
  let mockEq: ReturnType<typeof vi.fn>
  let mockSelect: ReturnType<typeof vi.fn>
  let mockFrom: ReturnType<typeof vi.fn>
  let mockGetUser: ReturnType<typeof vi.fn>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockClient: any

  beforeEach(() => {
    vi.clearAllMocks()
    state = { count: 0, isLoading: false }
    setState = (partial) => {
      state = { ...state, ...partial }
    }

    // Build Supabase client mock with chainable API
    mockEq = vi.fn().mockResolvedValue({ count: 0, error: null })
    mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
    mockFrom = vi.fn().mockReturnValue({ select: mockSelect })
    mockGetUser = vi.fn().mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    })

    mockClient = {
      from: mockFrom,
      auth: {
        getUser: mockGetUser,
      },
    }
  })

  describe('fetch', () => {
    it('sets isLoading=true during fetch', async () => {
      let loadingDuringFetch = false
      const customSetState = (partial: Partial<SyncErrorCountState>) => {
        state = { ...state, ...partial }
        if (partial.isLoading === true) {
          loadingDuringFetch = true
        }
      }

      const fetcher = createSyncErrorCountFetcher(customSetState, mockClient)
      await fetcher.fetch()
      expect(loadingDuringFetch).toBe(true)
    })

    it('sets isLoading=false after fetch completes', async () => {
      const fetcher = createSyncErrorCountFetcher(setState, mockClient)
      await fetcher.fetch()
      expect(state.isLoading).toBe(false)
    })

    it('returns count from Supabase', async () => {
      mockEq.mockResolvedValue({ count: 5, error: null })

      const fetcher = createSyncErrorCountFetcher(setState, mockClient)
      await fetcher.fetch()
      expect(state.count).toBe(5)
    })

    it('returns 0 when no errors', async () => {
      mockEq.mockResolvedValue({ count: 0, error: null })

      const fetcher = createSyncErrorCountFetcher(setState, mockClient)
      await fetcher.fetch()
      expect(state.count).toBe(0)
    })

    it('returns 0 when Supabase returns error', async () => {
      mockEq.mockResolvedValue({ count: null, error: { message: 'DB error' } })

      const fetcher = createSyncErrorCountFetcher(setState, mockClient)
      await fetcher.fetch()
      expect(state.count).toBe(0)
      expect(state.isLoading).toBe(false)
    })

    it('returns 0 when count is null', async () => {
      mockEq.mockResolvedValue({ count: null, error: null })

      const fetcher = createSyncErrorCountFetcher(setState, mockClient)
      await fetcher.fetch()
      expect(state.count).toBe(0)
    })

    it('queries sync_errors table', async () => {
      const fetcher = createSyncErrorCountFetcher(setState, mockClient)
      await fetcher.fetch()
      expect(mockFrom).toHaveBeenCalledWith('sync_errors')
    })

    it('filters by status=pending', async () => {
      const fetcher = createSyncErrorCountFetcher(setState, mockClient)
      await fetcher.fetch()
      expect(mockEq).toHaveBeenCalledWith('status', 'pending')
    })

    it('uses count-only select', async () => {
      const fetcher = createSyncErrorCountFetcher(setState, mockClient)
      await fetcher.fetch()
      expect(mockSelect).toHaveBeenCalledWith('id', { count: 'exact', head: true })
    })
  })

  describe('refetch', () => {
    it('re-queries Supabase', async () => {
      const fetcher = createSyncErrorCountFetcher(setState, mockClient)
      await fetcher.fetch()
      expect(mockFrom).toHaveBeenCalledTimes(1)

      mockEq.mockResolvedValue({ count: 3, error: null })
      await fetcher.fetch()
      expect(mockFrom).toHaveBeenCalledTimes(2)
      expect(state.count).toBe(3)
    })
  })

  describe('unauthenticated', () => {
    it('returns 0 when user is not authenticated', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const fetcher = createSyncErrorCountFetcher(setState, mockClient)
      await fetcher.fetch()
      expect(state.count).toBe(0)
    })
  })
})
