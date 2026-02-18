import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react-native'

// --- Mocks ---

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() }

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => ({}),
  Link: ({ children }: any) => children,
}))

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(() => ({
    user: { id: 'user-1', email: 'test@test.com' },
    profile: { role: 'employee', is_active: true, first_name: 'Test', last_name: 'User' },
    isAuthenticated: true,
    isAdmin: false,
    signOut: jest.fn(),
  })),
}))

const mockUpdate = jest.fn()
const mockUpdateEq = jest.fn(() => ({ eq: jest.fn().mockResolvedValue({ error: null }) }))

const mockOrder = jest.fn()
const mockStatusEq = jest.fn(() => ({ order: mockOrder }))
const mockUserEq = jest.fn(() => ({ eq: mockStatusEq }))
const mockSelect = jest.fn(() => ({ eq: mockUserEq }))
const mockFrom = jest.fn((table: string) => {
  if (table === 'inv_sync_errors') {
    return {
      select: mockSelect,
      update: mockUpdate,
    }
  }
  return { select: jest.fn() }
})

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: mockFrom,
    rpc: jest.fn(),
  }),
}))

import SyncErrorsScreen from './sync-errors'
import { useAuth } from '@/contexts/AuthContext'

// --- Mock data ---

const mockErrors = [
  {
    id: 'err-1',
    transaction_data: {
      itemId: 'item-1',
      transactionType: 'in',
      quantity: 10,
    },
    error_message: 'Item not found in database',
    status: 'new',
    user_id: 'user-1',
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    resolved_at: null,
    resolution_notes: null,
  },
  {
    id: 'err-2',
    transaction_data: {
      itemId: 'item-2',
      transactionType: 'out',
      quantity: 5,
    },
    error_message: 'Insufficient stock for check out',
    status: 'new',
    user_id: 'user-1',
    created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    resolved_at: null,
    resolution_notes: null,
  },
  {
    id: 'err-3',
    transaction_data: {
      itemId: 'item-3',
      transactionType: 'adjustment',
      quantity: -2,
    },
    error_message: 'Network timeout during submission',
    status: 'new',
    user_id: 'user-1',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    resolved_at: null,
    resolution_notes: null,
  },
]

// --- Tests ---

describe('SyncErrorsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Configure the chain: from('inv_sync_errors').select('*').eq('user_id', ...).eq('status', ...).order(...)
    mockOrder.mockResolvedValue({ data: mockErrors, error: null })
    // Configure update chain: from('inv_sync_errors').update({...}).eq('id', errorId)
    mockUpdate.mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    })
  })

  it('shows loading spinner initially', () => {
    // Make the fetch hang to observe loading state
    mockOrder.mockReturnValue(new Promise(() => {}))
    const { getByTestId } = render(<SyncErrorsScreen />)
    expect(getByTestId('sync-errors-loading')).toBeTruthy()
  })

  it('renders list of sync errors after loading', async () => {
    const { getByText } = render(<SyncErrorsScreen />)

    await waitFor(() => {
      expect(getByText('Item not found in database')).toBeTruthy()
      expect(getByText('Insufficient stock for check out')).toBeTruthy()
      expect(getByText('Network timeout during submission')).toBeTruthy()
    }, { timeout: 10000 })
  }, 15000)

  it('each error shows error message', async () => {
    const { getByTestId } = render(<SyncErrorsScreen />)

    await waitFor(() => {
      expect(getByTestId('error-message-err-1')).toBeTruthy()
      expect(getByTestId('error-message-err-2')).toBeTruthy()
      expect(getByTestId('error-message-err-3')).toBeTruthy()
    })
  })

  it('renders retry button per error item', async () => {
    const { getByTestId } = render(<SyncErrorsScreen />)

    await waitFor(() => {
      expect(getByTestId('retry-button-err-1')).toBeTruthy()
      expect(getByTestId('retry-button-err-2')).toBeTruthy()
      expect(getByTestId('retry-button-err-3')).toBeTruthy()
    })
  })

  it('renders dismiss button per error item', async () => {
    const { getByTestId } = render(<SyncErrorsScreen />)

    await waitFor(() => {
      expect(getByTestId('dismiss-button-err-1')).toBeTruthy()
      expect(getByTestId('dismiss-button-err-2')).toBeTruthy()
      expect(getByTestId('dismiss-button-err-3')).toBeTruthy()
    })
  })

  it('retry button calls Supabase update with status retrying', async () => {
    const { getByTestId } = render(<SyncErrorsScreen />)

    await waitFor(() => {
      expect(getByTestId('retry-button-err-1')).toBeTruthy()
    })

    fireEvent.press(getByTestId('retry-button-err-1'))

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('inv_sync_errors')
      expect(mockUpdate).toHaveBeenCalledWith({ status: 'retrying' })
    })
  })

  it('dismiss button calls Supabase update with status dismissed', async () => {
    const { getByTestId } = render(<SyncErrorsScreen />)

    await waitFor(() => {
      expect(getByTestId('dismiss-button-err-1')).toBeTruthy()
    })

    fireEvent.press(getByTestId('dismiss-button-err-1'))

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('inv_sync_errors')
      expect(mockUpdate).toHaveBeenCalledWith({ status: 'dismissed' })
    })
  })

  it('shows empty state when no errors', async () => {
    mockOrder.mockResolvedValue({ data: [], error: null })

    const { getByText } = render(<SyncErrorsScreen />)

    await waitFor(() => {
      expect(getByText('No sync errors')).toBeTruthy()
    })
  })

  it('back button navigates back', async () => {
    const { getByTestId } = render(<SyncErrorsScreen />)

    await waitFor(() => {
      expect(getByTestId('back-button')).toBeTruthy()
    })

    fireEvent.press(getByTestId('back-button'))
    expect(mockRouter.back).toHaveBeenCalled()
  })

  it('removes error from list after dismiss', async () => {
    const { getByTestId, queryByTestId } = render(<SyncErrorsScreen />)

    await waitFor(() => {
      expect(getByTestId('error-row-err-1')).toBeTruthy()
    })

    fireEvent.press(getByTestId('dismiss-button-err-1'))

    await waitFor(() => {
      expect(queryByTestId('error-row-err-1')).toBeNull()
    })
  })
})
