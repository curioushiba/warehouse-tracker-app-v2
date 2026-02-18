import React from 'react'
import { Text } from 'react-native'
import { render, fireEvent } from '@testing-library/react-native'
import { TabBar } from './TabBar'

const makeTabs = (badgeOverrides: Record<string, number | undefined> = {}) => [
  { key: 'home', label: 'Home', icon: <Text>H</Text>, badge: badgeOverrides.home },
  { key: 'scan', label: 'Scan', icon: <Text>S</Text>, badge: badgeOverrides.scan },
  { key: 'history', label: 'History', icon: <Text>Hi</Text>, badge: badgeOverrides.history },
]

describe('TabBar', () => {
  it('renders all tab labels', () => {
    const { getByText } = render(
      <TabBar
        tabs={makeTabs()}
        activeTab="home"
        onTabPress={() => {}}
        testID="tab-bar"
      />
    )
    expect(getByText('Home')).toBeTruthy()
    expect(getByText('Scan')).toBeTruthy()
    expect(getByText('History')).toBeTruthy()
  })

  it('highlights active tab with different color', () => {
    const { getByTestId } = render(
      <TabBar
        tabs={makeTabs()}
        activeTab="scan"
        onTabPress={() => {}}
        testID="tab-bar"
      />
    )
    const activeLabel = getByTestId('tab-bar-tab-scan-label')
    const inactiveLabel = getByTestId('tab-bar-tab-home-label')

    // Active tab text should have the active color
    expect(activeLabel.props.style).toEqual(
      expect.objectContaining({ color: '#01722f' })
    )
    // Inactive tab text should have the inactive color
    expect(inactiveLabel.props.style).toEqual(
      expect.objectContaining({ color: '#9ca3af' })
    )
  })

  it('calls onTabPress with tab key when pressed', () => {
    const onTabPress = jest.fn()
    const { getByTestId } = render(
      <TabBar
        tabs={makeTabs()}
        activeTab="home"
        onTabPress={onTabPress}
        testID="tab-bar"
      />
    )
    fireEvent.press(getByTestId('tab-bar-tab-scan'))
    expect(onTabPress).toHaveBeenCalledWith('scan')
  })

  it('shows badge count on tab when badge > 0', () => {
    const { getByText } = render(
      <TabBar
        tabs={makeTabs({ home: 5 })}
        activeTab="home"
        onTabPress={() => {}}
        testID="tab-bar"
      />
    )
    expect(getByText('5')).toBeTruthy()
  })

  it('hides badge when badge is 0 or undefined', () => {
    const { queryByTestId } = render(
      <TabBar
        tabs={makeTabs({ home: 0 })}
        activeTab="home"
        onTabPress={() => {}}
        testID="tab-bar"
      />
    )
    expect(queryByTestId('tab-bar-tab-home-badge')).toBeNull()
    expect(queryByTestId('tab-bar-tab-scan-badge')).toBeNull()
  })
})
