import React from 'react'
import { View, Text, Modal } from 'react-native'
import Animated, { SlideInDown } from 'react-native-reanimated'
import { CheckCircle } from 'lucide-react-native'
import { useTheme } from '@/theme'
import { AnimatedPressable } from '@/components/ui/AnimatedPressable'

export interface BatchConfirmModalProps {
  isOpen: boolean
  transactionType: 'in' | 'out'
  itemCount: number
  totalUnits: number
  onConfirm: () => void
  onCancel: () => void
  isSubmitting?: boolean
  testID?: string
}

export function BatchConfirmModal({
  isOpen,
  transactionType,
  itemCount,
  totalUnits,
  onConfirm,
  onCancel,
  isSubmitting = false,
  testID,
}: BatchConfirmModalProps) {
  const { colors, spacing, typography, radii } = useTheme()

  if (!isOpen) {
    return null
  }

  const typeConfig = {
    in: { label: 'CHECK IN', color: colors.checkIn },
    out: { label: 'CHECK OUT', color: colors.checkOut },
  }[transactionType]

  return (
    <Modal transparent animationType="fade" visible={isOpen}>
      <View
        testID={testID}
        style={{
          flex: 1,
          backgroundColor: colors.overlay,
          justifyContent: 'center',
          alignItems: 'center',
          padding: spacing[6],
        }}
      >
        <Animated.View
          entering={SlideInDown.springify().damping(20).stiffness(200)}
          style={{
            backgroundColor: colors.surfaceElevated,
            borderRadius: radii.xl,
            padding: spacing[6],
            width: '100%',
            maxWidth: 340,
            alignItems: 'center',
          }}
        >
          <CheckCircle size={56} color={colors.success} style={{ marginBottom: spacing[4] }} />

          <View
            style={{
              paddingHorizontal: spacing[4],
              paddingVertical: spacing[1.5],
              borderRadius: radii.md,
              marginBottom: spacing[4],
              backgroundColor: typeConfig.color,
            }}
          >
            <Text
              style={{
                color: colors.textInverse,
                fontSize: typography.base.fontSize,
                lineHeight: typography.base.lineHeight,
                fontWeight: typography.weight.bold,
                letterSpacing: 0.5,
              }}
            >
              {typeConfig.label}
            </Text>
          </View>

          <Text
            style={{
              fontSize: typography.xl.fontSize,
              lineHeight: typography.xl.lineHeight,
              fontWeight: typography.weight.bold,
              color: colors.textPrimary,
              marginBottom: spacing[1],
            }}
          >
            {itemCount} items
          </Text>
          <Text
            style={{
              fontSize: typography.base.fontSize,
              lineHeight: typography.base.lineHeight,
              color: colors.textSecondary,
              marginBottom: spacing[6],
            }}
          >
            {totalUnits} total units
          </Text>

          <View
            style={{
              flexDirection: 'row',
              gap: spacing[3],
              width: '100%',
            }}
          >
            <AnimatedPressable
              testID={`${testID ?? 'modal'}-cancel`}
              style={{
                flex: 1,
                height: 48,
                borderRadius: radii.md,
                borderWidth: 1,
                borderColor: colors.borderPrimary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onPress={onCancel}
              hapticPattern="light"
            >
              <Text
                style={{
                  fontSize: typography.base.fontSize,
                  fontWeight: typography.weight.semibold,
                  color: colors.textPrimary,
                }}
              >
                Cancel
              </Text>
            </AnimatedPressable>

            <AnimatedPressable
              testID={`${testID ?? 'modal'}-confirm`}
              style={[
                {
                  flex: 1,
                  height: 48,
                  borderRadius: radii.md,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: typeConfig.color,
                },
                isSubmitting ? { opacity: 0.6 } : undefined,
              ]}
              onPress={onConfirm}
              disabled={isSubmitting}
              hapticPattern="heavy"
            >
              <Text
                style={{
                  fontSize: typography.base.fontSize,
                  fontWeight: typography.weight.semibold,
                  color: colors.textInverse,
                }}
              >
                {isSubmitting ? 'Submitting...' : 'Confirm'}
              </Text>
            </AnimatedPressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  )
}
