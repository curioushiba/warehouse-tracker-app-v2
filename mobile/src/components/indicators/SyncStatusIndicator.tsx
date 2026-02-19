import React, { useEffect } from 'react'
import { View, Text } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'
import { useTheme } from '@/theme'
import type { SyncStatus } from '@/types'

export interface SyncStatusIndicatorProps {
  status: SyncStatus
  pendingCount?: number
  testID?: string
}

export function SyncStatusIndicator({
  status,
  pendingCount,
  testID,
}: SyncStatusIndicatorProps) {
  const { colors, spacing, typography } = useTheme()

  const dotOpacity = useSharedValue(1)

  useEffect(() => {
    if (status === 'syncing') {
      dotOpacity.value = withRepeat(
        withTiming(0.3, { duration: 800 }),
        -1,
        true
      )
    } else {
      dotOpacity.value = withTiming(1, { duration: 200 })
    }
  }, [status, dotOpacity])

  const animatedDotStyle = useAnimatedStyle(() => ({
    opacity: dotOpacity.value,
  }))

  const statusColorMap: Record<SyncStatus, string> = {
    synced: colors.success,
    syncing: colors.info,
    pending: colors.warning,
    offline: colors.error,
    error: colors.error,
  }

  const statusLabelMap: Record<SyncStatus, string> = {
    synced: 'Synced',
    syncing: 'Syncing...',
    pending: 'pending',
    offline: 'Offline',
    error: 'Error',
  }

  const color = statusColorMap[status]

  const label =
    status === 'pending' && pendingCount != null
      ? `${pendingCount} ${statusLabelMap[status]}`
      : statusLabelMap[status]

  return (
    <View testID={testID} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1.5] }}>
      <Animated.View
        testID={testID ? `${testID}-dot` : undefined}
        style={[
          {
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: color,
          },
          animatedDotStyle,
        ]}
      />
      <Text
        style={{
          fontSize: typography.sm.fontSize,
          lineHeight: typography.sm.lineHeight,
          fontWeight: typography.weight.medium,
          color,
        }}
      >
        {label}
      </Text>
    </View>
  )
}
