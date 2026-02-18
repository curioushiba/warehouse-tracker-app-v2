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

import DomainPickerScreen from './domain-picker'
import { useAuth } from '@/contexts/AuthContext'
import { useDomain } from '@/contexts/DomainContext'

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
  })

  it('renders Commissary card with brand color', () => {
    const { getByTestId } = render(<DomainPickerScreen />)
    const card = getByTestId('domain-card-commissary')
    expect(card).toBeTruthy()
    // Check that the card has the orange brand color
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

  it('highlights last-selected domain', () => {
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
})
