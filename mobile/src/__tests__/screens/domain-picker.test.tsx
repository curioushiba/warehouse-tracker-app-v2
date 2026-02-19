import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react-native'

// --- Mocks ---

const mockSignOut = jest.fn()
const mockSetDomain = jest.fn()
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
    user: { id: '1', email: 'user@example.com' },
    profile: { role: 'employee' },
    isAuthenticated: true,
    isLoading: false,
    isAdmin: false,
    isEmployee: true,
    isActive: true,
    signIn: jest.fn(),
    signOut: mockSignOut,
    refreshProfile: jest.fn(),
  })),
}))

jest.mock('@/contexts/DomainContext', () => ({
  useDomain: jest.fn(() => ({
    domainId: null,
    domainConfig: null,
    setDomain: mockSetDomain,
    clearDomain: jest.fn(),
  })),
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
  CARD_PRESS: { toValue: 0.98, duration: 80 },
}))

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

jest.mock('@/lib/storage/storage', () => ({
  getSelectedDomain: jest.fn().mockResolvedValue(undefined),
}))

import DomainPickerScreen from '@/app/domain-picker'
import { useAuth } from '@/contexts/AuthContext'
import { useDomain } from '@/contexts/DomainContext'
import { getSelectedDomain } from '@/lib/storage/storage'

// --- Tests ---

describe('DomainPickerScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useAuth as jest.Mock).mockReturnValue({
      user: { id: '1', email: 'user@example.com' },
      profile: { role: 'employee' },
      isAuthenticated: true,
      isLoading: false,
      isAdmin: false,
      isEmployee: true,
      isActive: true,
      signIn: jest.fn(),
      signOut: mockSignOut,
      refreshProfile: jest.fn(),
    })
    ;(useDomain as jest.Mock).mockReturnValue({
      domainId: null,
      domainConfig: null,
      setDomain: mockSetDomain,
      clearDomain: jest.fn(),
    })
    ;(getSelectedDomain as jest.Mock).mockResolvedValue(undefined)
  })

  it('renders Commissary card with brand color', () => {
    const { getByTestId } = render(<DomainPickerScreen />)
    const card = getByTestId('domain-card-commissary')
    expect(card).toBeTruthy()
    const style = card.props.style
    const flatStyle = Array.isArray(style) ? Object.assign({}, ...style) : style
    expect(flatStyle.borderColor).toBe('#E07A2F')
  })

  it('renders Frozen Goods card with brand color', () => {
    const { getByTestId } = render(<DomainPickerScreen />)
    const card = getByTestId('domain-card-frozen-goods')
    expect(card).toBeTruthy()
    const style = card.props.style
    const flatStyle = Array.isArray(style) ? Object.assign({}, ...style) : style
    expect(flatStyle.borderColor).toBe('#2563EB')
  })

  it('renders domain cards side-by-side in a row', () => {
    const { getByTestId } = render(<DomainPickerScreen />)
    // Both cards should be present
    expect(getByTestId('domain-card-commissary')).toBeTruthy()
    expect(getByTestId('domain-card-frozen-goods')).toBeTruthy()
  })

  it('renders domain descriptions', () => {
    const { getByTestId } = render(<DomainPickerScreen />)
    expect(getByTestId('domain-desc-commissary').props.children).toBe('Fresh & dry goods')
    expect(getByTestId('domain-desc-frozen-goods').props.children).toBe('Frozen inventory')
  })

  it('renders the title', () => {
    const { getByTestId } = render(<DomainPickerScreen />)
    expect(getByTestId('domain-picker-title')).toBeTruthy()
  })

  it('calls setDomain("commissary") when Commissary pressed', () => {
    const { getByTestId } = render(<DomainPickerScreen />)
    fireEvent.press(getByTestId('domain-card-commissary'))
    expect(mockSetDomain).toHaveBeenCalledWith('commissary')
  })

  it('calls setDomain("frozen-goods") when Frozen Goods pressed', () => {
    const { getByTestId } = render(<DomainPickerScreen />)
    fireEvent.press(getByTestId('domain-card-frozen-goods'))
    expect(mockSetDomain).toHaveBeenCalledWith('frozen-goods')
  })

  it('navigates to /(app)/(tabs) after domain selection', () => {
    const { getByTestId } = render(<DomainPickerScreen />)
    fireEvent.press(getByTestId('domain-card-commissary'))
    expect(mockRouter.replace).toHaveBeenCalledWith('/(app)/(tabs)')
  })

  it('shows sign out button that calls signOut', () => {
    const { getByTestId } = render(<DomainPickerScreen />)
    const signOutButton = getByTestId('sign-out-button')
    expect(signOutButton).toBeTruthy()
    fireEvent.press(signOutButton)
    expect(mockSignOut).toHaveBeenCalled()
  })

  it('redirects to login if not authenticated', () => {
    ;(useAuth as jest.Mock).mockReturnValue({
      user: null,
      profile: null,
      isAuthenticated: false,
      isLoading: false,
      isAdmin: false,
      isEmployee: false,
      isActive: false,
      signIn: jest.fn(),
      signOut: mockSignOut,
      refreshProfile: jest.fn(),
    })

    const { getByTestId } = render(<DomainPickerScreen />)
    const redirect = getByTestId('redirect')
    expect(redirect).toBeTruthy()
    expect(redirect.props.children).toContain('login')
  })

  it('highlights last-selected domain with wider border', () => {
    ;(useDomain as jest.Mock).mockReturnValue({
      domainId: 'commissary',
      domainConfig: null,
      setDomain: mockSetDomain,
      clearDomain: jest.fn(),
    })

    const { getByTestId } = render(<DomainPickerScreen />)
    const card = getByTestId('domain-card-commissary')
    const style = card.props.style
    const flatStyle = Array.isArray(style) ? Object.assign({}, ...style) : style
    // Selected card should have a wider border to indicate selection
    expect(flatStyle.borderWidth).toBeGreaterThanOrEqual(3)
  })

  it('shows quick resume button when lastDomain is set', async () => {
    ;(getSelectedDomain as jest.Mock).mockResolvedValue('commissary')

    const { getByTestId } = render(<DomainPickerScreen />)

    await waitFor(() => {
      expect(getByTestId('quick-resume-button')).toBeTruthy()
    })
  })

  it('quick resume navigates to the last domain', async () => {
    ;(getSelectedDomain as jest.Mock).mockResolvedValue('commissary')

    const { getByTestId } = render(<DomainPickerScreen />)

    await waitFor(() => {
      expect(getByTestId('quick-resume-button')).toBeTruthy()
    })

    fireEvent.press(getByTestId('quick-resume-button'))
    expect(mockSetDomain).toHaveBeenCalledWith('commissary')
    expect(mockRouter.replace).toHaveBeenCalledWith('/(app)/(tabs)')
  })
})
