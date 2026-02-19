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

jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: require('@/theme/tokens').lightColors,
    spacing: require('@/theme/tokens').spacing,
    typography: require('@/theme/tokens').typography,
    shadows: require('@/theme/tokens').shadows,
    radii: require('@/theme/tokens').radii,
    isDark: false,
  }),
}))

jest.mock('@/components/layout/ScreenHeader', () => ({
  ScreenHeader: ({ title, onBack, rightContent, testID }: any) => {
    const { View, Text, Pressable } = require('react-native')
    return (
      <View testID={testID}>
        {onBack && <Pressable testID={`${testID}-back`} onPress={onBack} />}
        <Text>{title}</Text>
        {rightContent}
      </View>
    )
  },
}))

jest.mock('@/components/ui/EmptyState', () => ({
  EmptyState: ({ title, message, action, testID }: any) => {
    const { View, Text, Pressable } = require('react-native')
    return (
      <View testID={testID}>
        <Text>{title}</Text>
        <Text>{message}</Text>
        {action && (
          <Pressable testID={`${testID}-action`} onPress={action.onPress}>
            <Text>{action.label}</Text>
          </Pressable>
        )}
      </View>
    )
  },
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

import SyncErrorsScreen from '@/app/(app)/sync-errors'

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

  it('renders ScreenHeader with title', async () => {
    const { getByText } = render(<SyncErrorsScreen />)
    await waitFor(() => {
      expect(getByText('Sync Errors')).toBeTruthy()
    })
  })

  it('renders error count badge when errors exist', async () => {
    const { getByTestId } = render(<SyncErrorsScreen />)
    await waitFor(() => {
      expect(getByTestId('error-count-badge')).toBeTruthy()
    })
  })

  it('renders error summary bar with unresolved count', async () => {
    const { getByTestId, getByText } = render(<SyncErrorsScreen />)
    await waitFor(() => {
      expect(getByTestId('error-summary-bar')).toBeTruthy()
      expect(getByText('3 unresolved errors')).toBeTruthy()
    })
  })

  it('renders list of sync errors after loading', async () => {
    const { getByTestId } = render(<SyncErrorsScreen />)

    await waitFor(() => {
      // humanized error messages
      expect(getByTestId('error-message-err-1')).toBeTruthy()
      expect(getByTestId('error-message-err-2')).toBeTruthy()
      expect(getByTestId('error-message-err-3')).toBeTruthy()
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
      expect(getByText('All Clear!')).toBeTruthy()
    })
  })

  it('empty state has Go Back action', async () => {
    mockOrder.mockResolvedValue({ data: [], error: null })

    const { getByTestId } = render(<SyncErrorsScreen />)

    await waitFor(() => {
      expect(getByTestId('empty-state-action')).toBeTruthy()
    })

    fireEvent.press(getByTestId('empty-state-action'))
    expect(mockRouter.back).toHaveBeenCalled()
  })

  it('back button navigates back', async () => {
    const { getByTestId } = render(<SyncErrorsScreen />)

    await waitFor(() => {
      expect(getByTestId('screen-header-back')).toBeTruthy()
    })

    fireEvent.press(getByTestId('screen-header-back'))
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

  it('shows Retry All button in summary bar when errors exist', async () => {
    const { getByTestId } = render(<SyncErrorsScreen />)

    await waitFor(() => {
      expect(getByTestId('retry-all-button')).toBeTruthy()
    })
  })

  it('Retry All clears all errors', async () => {
    const { getByTestId, queryByTestId } = render(<SyncErrorsScreen />)

    await waitFor(() => {
      expect(getByTestId('retry-all-button')).toBeTruthy()
    })

    fireEvent.press(getByTestId('retry-all-button'))

    await waitFor(() => {
      expect(queryByTestId('error-row-err-1')).toBeNull()
      expect(queryByTestId('error-row-err-2')).toBeNull()
      expect(queryByTestId('error-row-err-3')).toBeNull()
    })
  })
})
