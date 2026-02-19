import React from 'react'
import { Text, View } from 'react-native'
import Animated, { SlideInDown, SlideOutUp } from 'react-native-reanimated'
import { useTheme } from '@/theme'

export interface ConnectionStatusBarProps {
  isOnline: boolean
  isSyncing?: boolean
  syncProgress?: number
  testID?: string
}

export function ConnectionStatusBar({
  isOnline,
  isSyncing = false,
  syncProgress,
  testID,
}: ConnectionStatusBarProps) {
  const { colors, spacing, typography } = useTheme()

  if (isOnline && !isSyncing) {
    return null
  }

  const textStyle = {
    color: colors.textInverse,
    fontSize: typography.sm.fontSize,
    lineHeight: typography.sm.lineHeight,
    fontWeight: typography.weight.semibold,
  } as const

  if (isSyncing) {
    return (
      <Animated.View
        testID={testID}
        entering={SlideInDown.duration(250)}
        exiting={SlideOutUp.duration(250)}
        style={{
          backgroundColor: colors.info,
          paddingVertical: spacing[1.5],
          paddingHorizontal: spacing[3],
          alignItems: 'center',
        }}
      >
        <Text style={textStyle}>
          Syncing... {syncProgress != null ? `${syncProgress}%` : ''}
        </Text>
        <View
          style={{
            height: 3,
            backgroundColor: colors.overlaySubtle,
            borderRadius: 1.5,
            marginTop: spacing[1],
            width: '100%',
          }}
        >
          <View
            testID={testID ? `${testID}-progress` : undefined}
            style={{
              height: 3,
              backgroundColor: colors.textInverse,
              borderRadius: 1.5,
              width: `${syncProgress ?? 0}%`,
            }}
          />
        </View>
      </Animated.View>
    )
  }

  return (
    <Animated.View
      testID={testID}
      entering={SlideInDown.duration(250)}
      exiting={SlideOutUp.duration(250)}
      style={{
        backgroundColor: colors.error,
        paddingVertical: spacing[1.5],
        paddingHorizontal: spacing[3],
        alignItems: 'center',
      }}
    >
      <Text style={textStyle}>No internet connection</Text>
    </Animated.View>
  )
}
