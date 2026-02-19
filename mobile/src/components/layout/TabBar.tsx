import React from 'react'
import { View, Text } from 'react-native'
import { useTheme } from '@/theme'
import { AnimatedPressable } from '@/components/ui/AnimatedPressable'

export interface TabItem {
  key: string
  label: string
  icon: React.ReactNode
  badge?: number
}

export interface TabBarProps {
  tabs: TabItem[]
  activeTab: string
  onTabPress: (key: string) => void
  testID?: string
}

function TabBarTab({
  tab,
  isActive,
  onPress,
  testID,
}: {
  tab: TabItem
  isActive: boolean
  onPress: () => void
  testID?: string
}) {
  const { colors, typography, spacing } = useTheme()

  return (
    <AnimatedPressable
      testID={testID}
      style={{
        flex: 1,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        height: 60,
      }}
      onPress={onPress}
      scaleValue={0.9}
    >
      <View style={{ position: 'relative' }}>
        {tab.icon}
        {tab.badge != null && tab.badge > 0 && (
          <View
            testID={testID ? `${testID}-badge` : undefined}
            style={{
              position: 'absolute',
              top: -4,
              right: -10,
              backgroundColor: colors.error,
              borderRadius: 8,
              minWidth: 16,
              height: 16,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: spacing[1],
            }}
          >
            <Text
              style={{
                color: colors.textInverse,
                ...typography.xs,
                fontWeight: typography.weight.bold,
                fontSize: 10,
              }}
            >
              {tab.badge}
            </Text>
          </View>
        )}
      </View>
      <Text
        testID={testID ? `${testID}-label` : undefined}
        style={{
          ...typography.xs,
          fontWeight: isActive ? typography.weight.semibold : typography.weight.normal,
          color: isActive ? colors.brandPrimary : colors.textTertiary,
          marginTop: 2,
        }}
      >
        {tab.label}
      </Text>
    </AnimatedPressable>
  )
}

export function TabBar({ tabs, activeTab, onTabPress, testID }: TabBarProps) {
  const { colors, shadows } = useTheme()

  return (
    <View
      testID={testID}
      style={[
        {
          flexDirection: 'row',
          backgroundColor: colors.surfacePrimary,
          borderTopWidth: 1,
          borderTopColor: colors.borderSubtle,
        },
        shadows.sm,
      ]}
    >
      {tabs.map((tab) => {
        const isActive = tab.key === activeTab
        return (
          <TabBarTab
            key={tab.key}
            tab={tab}
            isActive={isActive}
            onPress={() => onTabPress(tab.key)}
            testID={testID ? `${testID}-tab-${tab.key}` : undefined}
          />
        )
      })}
    </View>
  )
}
