import React from 'react'
import { View, Text } from 'react-native'
import Animated, { SlideInUp } from 'react-native-reanimated'
import { X, Info, CheckCircle, AlertTriangle, XCircle } from 'lucide-react-native'
import type { AlertStatus } from '@/types'
import { useTheme, SLIDE_DURATION, type SemanticColors } from '@/theme'
import { AnimatedPressable } from '@/components/ui/AnimatedPressable'

export interface AlertProps {
  title: string
  message?: string
  status: AlertStatus
  onClose?: () => void
  testID?: string
}

const STATUS_ICONS: Record<AlertStatus, React.ComponentType<{ size?: number; color?: string; testID?: string }>> = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
}

function getStatusColors(colors: SemanticColors, status: AlertStatus) {
  switch (status) {
    case 'info':
      return { bg: colors.infoBg, text: colors.infoText, icon: colors.info }
    case 'success':
      return { bg: colors.successBg, text: colors.successText, icon: colors.success }
    case 'warning':
      return { bg: colors.warningBg, text: colors.warningText, icon: colors.warning }
    case 'error':
      return { bg: colors.errorBg, text: colors.errorText, icon: colors.error }
  }
}

export function Alert({ title, message, status, onClose, testID }: AlertProps) {
  const { colors, spacing, radii, typography } = useTheme()
  const statusColors = getStatusColors(colors, status)
  const StatusIcon = STATUS_ICONS[status]

  return (
    <Animated.View
      entering={SlideInUp.duration(SLIDE_DURATION)}
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: spacing[3],
        borderRadius: radii.md,
        width: '100%',
        backgroundColor: statusColors.bg,
      }}
      testID={testID}
    >
      <View style={{ marginRight: spacing[2], marginTop: 1 }}>
        <StatusIcon size={20} color={statusColors.icon} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{
          fontSize: typography.base.fontSize,
          lineHeight: typography.base.lineHeight,
          fontWeight: typography.weight.semibold,
          color: statusColors.text,
        }}>
          {title}
        </Text>
        {message ? (
          <Text
            style={{
              fontSize: typography.sm.fontSize,
              lineHeight: typography.sm.lineHeight,
              marginTop: 2,
              color: statusColors.text,
            }}
            testID={testID ? `${testID}-message` : 'alert-message'}
          >
            {message}
          </Text>
        ) : null}
      </View>
      {onClose ? (
        <AnimatedPressable
          onPress={onClose}
          testID="alert-close"
          style={{ marginLeft: spacing[2], padding: 2 }}
        >
          <X size={16} color={statusColors.text} />
        </AnimatedPressable>
      ) : null}
    </Animated.View>
  )
}
