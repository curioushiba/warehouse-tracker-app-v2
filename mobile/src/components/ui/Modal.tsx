import React, { useEffect } from 'react'
import {
  Modal as RNModal,
  View,
  Text,
  Pressable,
  type ViewStyle,
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { X } from 'lucide-react-native'
import type { ModalSize } from '@/types'
import { useTheme, MODAL_SPRING, FADE_DURATION } from '@/theme'
import { AnimatedPressable } from '@/components/ui/AnimatedPressable'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
  size?: ModalSize
  testID?: string
}

const SIZE_WIDTHS: Record<ModalSize, ViewStyle> = {
  sm: { maxWidth: 320 },
  md: { maxWidth: 400 },
  lg: { maxWidth: 520 },
  full: { maxWidth: '100%' as unknown as number, margin: 0, borderRadius: 0 },
}

export function Modal({
  isOpen,
  onClose,
  children,
  title,
  size = 'md',
  testID,
}: ModalProps) {
  const { colors, spacing, typography, radii } = useTheme()

  const scale = useSharedValue(0.9)
  const translateY = useSharedValue(20)
  const opacity = useSharedValue(0)

  useEffect(() => {
    if (isOpen) {
      scale.value = withSpring(1, MODAL_SPRING)
      translateY.value = withSpring(0, MODAL_SPRING)
      opacity.value = withTiming(1, { duration: FADE_DURATION })
    } else {
      scale.value = 0.9
      translateY.value = 20
      opacity.value = 0
    }
  }, [isOpen, scale, translateY, opacity])

  const animatedContentStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateY: translateY.value },
    ],
    opacity: opacity.value,
  }))

  return (
    <RNModal
      visible={isOpen}
      transparent
      animationType="none"
      onRequestClose={onClose}
      testID={testID}
    >
      <Pressable
        onPress={onClose}
        testID="modal-overlay"
        style={{
          flex: 1,
          backgroundColor: colors.overlay,
          justifyContent: 'center',
          alignItems: 'center',
          padding: spacing[6],
        }}
      >
        <Pressable onPress={(e) => e.stopPropagation()}>
          <Animated.View style={[
            {
              backgroundColor: colors.surfaceElevated,
              borderRadius: radii.lg,
              width: '100%',
              padding: spacing[5],
            },
            SIZE_WIDTHS[size],
            animatedContentStyle,
          ]}>
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: spacing[4],
            }}>
              {title ? (
                <Text style={{
                  ...typography.xl,
                  fontWeight: typography.weight.semibold,
                  color: colors.textPrimary,
                  flex: 1,
                }}>
                  {title}
                </Text>
              ) : (
                <View />
              )}
              <AnimatedPressable
                onPress={onClose}
                testID="modal-close"
              >
                <View style={{ padding: 8 }}>
                  <X size={20} color={colors.iconSecondary} />
                </View>
              </AnimatedPressable>
            </View>
            <View>{children}</View>
          </Animated.View>
        </Pressable>
      </Pressable>
    </RNModal>
  )
}
