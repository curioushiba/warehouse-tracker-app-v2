import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react-native'

// --- Mocks ---

const mockSignIn = jest.fn()
const mockSignOut = jest.fn()
const mockRefreshProfile = jest.fn()
const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() }

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => ({}),
  Link: ({ children }: any) => children,
  Redirect: ({ href }: { href: string }) => {
    const { Text } = require('react-native')
    return require('react').createElement(Text, { testID: 'redirect' }, `Redirect:${href}`)
  },
  Tabs: ({ children }: any) => children,
  Stack: ({ children }: any) => children,
  Slot: () => null,
}))

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(() => ({
    user: null,
    profile: null,
    isAuthenticated: false,
    isLoading: false,
    isAdmin: false,
    isEmployee: false,
    isActive: false,
    signIn: mockSignIn,
    signOut: mockSignOut,
    refreshProfile: mockRefreshProfile,
  })),
}))

jest.mock('react-native-toast-message', () => ({
  __esModule: true,
  default: {
    show: jest.fn(),
    hide: jest.fn(),
  },
}))

jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: require('@/theme/tokens').lightColors,
    spacing: require('@/theme/tokens').spacing,
    typography: require('@/theme/tokens').typography,
    shadows: require('@/theme/tokens').shadows,
    radii: require('@/theme/tokens').radii,
    fontFamily: require('@/theme/tokens').fontFamily,
    typePresets: require('@/theme/tokens').typePresets,
    zIndex: require('@/theme/tokens').zIndex,
    touchTarget: require('@/theme/tokens').touchTarget,
    isDark: false,
  }),
}))

jest.mock('@/lib/storage/storage', () => ({
  getString: jest.fn().mockResolvedValue(undefined),
  setString: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native')
  return { LinearGradient: View }
})

jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock')
  return {
    ...Reanimated,
    useSharedValue: jest.fn((init: any) => ({ value: init })),
    useAnimatedStyle: jest.fn(() => ({})),
    withTiming: jest.fn((val: any) => val),
    withSpring: jest.fn((val: any) => val),
    FadeInDown: { duration: jest.fn().mockReturnThis(), delay: jest.fn().mockReturnThis() },
    FadeInUp: { duration: jest.fn().mockReturnThis(), delay: jest.fn().mockReturnThis() },
    FadeIn: { duration: jest.fn().mockReturnThis() },
    FadeOut: { duration: jest.fn().mockReturnThis() },
    SlideInUp: { duration: jest.fn().mockReturnThis() },
    SlideInDown: { duration: jest.fn().mockReturnThis() },
  }
})

jest.mock('@/components/ui/AnimatedPressable', () => {
  const { TouchableOpacity } = require('react-native')
  const ReactModule = require('react')
  return {
    AnimatedPressable: ({ children, ...props }: any) =>
      ReactModule.createElement(TouchableOpacity, props, children),
  }
})

import LoginScreen from '@/app/(auth)/login'
import { useAuth } from '@/contexts/AuthContext'
import Toast from 'react-native-toast-message'

// --- Tests ---

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useAuth as jest.Mock).mockReturnValue({
      user: null,
      profile: null,
      isAuthenticated: false,
      isLoading: false,
      isAdmin: false,
      isEmployee: false,
      isActive: false,
      signIn: mockSignIn,
      signOut: mockSignOut,
      refreshProfile: mockRefreshProfile,
    })
  })

  it('renders username and password inputs', () => {
    const { getByTestId } = render(<LoginScreen />)
    expect(getByTestId('username-input')).toBeTruthy()
    expect(getByTestId('password-input')).toBeTruthy()
  })

  it('renders sign in button', () => {
    const { getByTestId } = render(<LoginScreen />)
    expect(getByTestId('sign-in-button')).toBeTruthy()
  })

  it('renders the PackTrack title', () => {
    const { getByTestId } = render(<LoginScreen />)
    expect(getByTestId('login-title')).toBeTruthy()
  })

  it('renders the subtitle', () => {
    const { getByTestId } = render(<LoginScreen />)
    expect(getByTestId('login-subtitle')).toBeTruthy()
  })

  it('renders the top gradient', () => {
    const { getByTestId } = render(<LoginScreen />)
    expect(getByTestId('login-gradient')).toBeTruthy()
  })

  it('renders the divider', () => {
    const { getByTestId } = render(<LoginScreen />)
    expect(getByTestId('login-divider')).toBeTruthy()
  })

  it('renders the version number', () => {
    const { getByTestId } = render(<LoginScreen />)
    const version = getByTestId('login-version')
    expect(version).toBeTruthy()
    expect(version.props.children).toBe('v1.0.0')
  })

  it('does not call signIn when fields are empty', () => {
    const { getByTestId } = render(<LoginScreen />)
    const button = getByTestId('sign-in-button')
    fireEvent.press(button)
    expect(mockSignIn).not.toHaveBeenCalled()
  })

  it('calls signIn with username and password on press', async () => {
    mockSignIn.mockResolvedValue({ error: null })
    const { getByTestId } = render(<LoginScreen />)

    fireEvent.changeText(getByTestId('username-input'), 'testuser')
    fireEvent.changeText(getByTestId('password-input'), 'password123')
    fireEvent.press(getByTestId('sign-in-button'))

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('testuser', 'password123')
    })
  })

  it('shows loading state while signing in', async () => {
    // signIn never resolves to simulate loading
    mockSignIn.mockReturnValue(new Promise(() => {}))
    const { getByTestId } = render(<LoginScreen />)

    fireEvent.changeText(getByTestId('username-input'), 'testuser')
    fireEvent.changeText(getByTestId('password-input'), 'password123')
    fireEvent.press(getByTestId('sign-in-button'))

    await waitFor(() => {
      expect(getByTestId('sign-in-button').props.accessibilityState?.disabled).toBe(true)
    })
  })

  it('shows error toast when signIn returns error', async () => {
    mockSignIn.mockResolvedValue({ error: 'Invalid credentials' })
    const { getByTestId } = render(<LoginScreen />)

    fireEvent.changeText(getByTestId('username-input'), 'testuser')
    fireEvent.changeText(getByTestId('password-input'), 'wrongpassword')
    fireEvent.press(getByTestId('sign-in-button'))

    await waitFor(() => {
      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          text1: 'Invalid credentials',
        })
      )
    })
  })

  it('navigates to domain-picker on successful sign in', async () => {
    mockSignIn.mockResolvedValue({ error: null })
    const { getByTestId } = render(<LoginScreen />)

    fireEvent.changeText(getByTestId('username-input'), 'testuser')
    fireEvent.changeText(getByTestId('password-input'), 'password123')
    fireEvent.press(getByTestId('sign-in-button'))

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith('/domain-picker')
    })
  })

  it('renders password toggle icon', () => {
    const { getByTestId } = render(<LoginScreen />)
    expect(getByTestId('password-toggle')).toBeTruthy()
  })

  it('toggles password visibility when eye icon pressed', () => {
    const { getByTestId } = render(<LoginScreen />)
    const passwordInput = getByTestId('password-input')

    // Initially password is hidden
    expect(passwordInput.props.secureTextEntry).toBe(true)

    // Press the toggle
    fireEvent.press(getByTestId('password-toggle'))

    // Password should now be visible
    expect(getByTestId('password-input').props.secureTextEntry).toBe(false)
  })

  it('shows username required error on submit with empty username', async () => {
    const { getByTestId, queryByTestId } = render(<LoginScreen />)

    // No error initially
    expect(queryByTestId('username-input-error')).toBeNull()

    // Fill password only, leave username empty
    fireEvent.changeText(getByTestId('password-input'), 'password123')
    fireEvent.press(getByTestId('sign-in-button'))

    await waitFor(() => {
      expect(getByTestId('username-input-error')).toBeTruthy()
    })
  })

  it('shows password required error on submit with empty password', async () => {
    const { getByTestId, queryByTestId } = render(<LoginScreen />)

    expect(queryByTestId('password-input-error')).toBeNull()

    fireEvent.changeText(getByTestId('username-input'), 'testuser')
    fireEvent.press(getByTestId('sign-in-button'))

    await waitFor(() => {
      expect(getByTestId('password-input-error')).toBeTruthy()
    })
  })

  it('shows both field errors on submit with both fields empty', async () => {
    const { getByTestId } = render(<LoginScreen />)

    fireEvent.press(getByTestId('sign-in-button'))

    await waitFor(() => {
      expect(getByTestId('username-input-error')).toBeTruthy()
      expect(getByTestId('password-input-error')).toBeTruthy()
    })
  })

  it('does not show field errors before first submit attempt', () => {
    const { queryByTestId } = render(<LoginScreen />)
    expect(queryByTestId('username-input-error')).toBeNull()
    expect(queryByTestId('password-input-error')).toBeNull()
  })

  it('clears field error when user fills in the field after failed submit', async () => {
    const { getByTestId, queryByTestId } = render(<LoginScreen />)

    fireEvent.press(getByTestId('sign-in-button'))

    await waitFor(() => {
      expect(getByTestId('username-input-error')).toBeTruthy()
    })

    fireEvent.changeText(getByTestId('username-input'), 'testuser')

    await waitFor(() => {
      expect(queryByTestId('username-input-error')).toBeNull()
    })
  })

  it('shows toast on unexpected network error', async () => {
    mockSignIn.mockRejectedValue(new Error('Network request failed'))
    const { getByTestId } = render(<LoginScreen />)

    fireEvent.changeText(getByTestId('username-input'), 'testuser')
    fireEvent.changeText(getByTestId('password-input'), 'password123')
    fireEvent.press(getByTestId('sign-in-button'))

    await waitFor(() => {
      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          text1: 'Something went wrong. Please check your connection and try again.',
        })
      )
    })
  })

  it('auto-redirects if already authenticated', () => {
    ;(useAuth as jest.Mock).mockReturnValue({
      user: { id: '1', email: 'a@b.com' },
      profile: { role: 'employee' },
      isAuthenticated: true,
      isLoading: false,
      isAdmin: false,
      isEmployee: true,
      isActive: true,
      signIn: mockSignIn,
      signOut: mockSignOut,
      refreshProfile: mockRefreshProfile,
    })

    const { getByTestId } = render(<LoginScreen />)
    expect(getByTestId('redirect')).toBeTruthy()
  })
})
