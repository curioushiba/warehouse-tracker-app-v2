import React, { useRef } from 'react'
import { View, Text, Animated as RNAnimated } from 'react-native'
import { Swipeable } from 'react-native-gesture-handler'
import { Plus, Minus, Trash2 } from 'lucide-react-native'
import { useTheme } from '@/theme'
import { clampQuantity } from '@/lib/constants'
import { AnimatedPressable } from '@/components/ui/AnimatedPressable'

export interface BatchItemRowItem {
  id: string
  name: string
  quantity: number
  unit?: string
  currentStock?: number
}

export interface BatchItemRowProps {
  item: BatchItemRowItem
  onQuantityChange: (id: string, quantity: number) => void
  onRemove: (id: string) => void
  showStockError?: boolean
  testID?: string
}

export function BatchItemRow({
  item,
  onQuantityChange,
  onRemove,
  showStockError = false,
  testID,
}: BatchItemRowProps) {
  const { colors, spacing, typography, radii } = useTheme()
  const swipeableRef = useRef<Swipeable>(null)

  const handlePlus = () => {
    onQuantityChange(item.id, clampQuantity(item.quantity + 1))
  }

  const handleMinus = () => {
    onQuantityChange(item.id, clampQuantity(item.quantity - 1))
  }

  const handleSwipeDelete = () => {
    swipeableRef.current?.close()
    onRemove(item.id)
  }

  const quantityDisplay = item.unit
    ? `${item.quantity} ${item.unit}`
    : `${item.quantity}`

  const renderRightActions = (
    _progress: RNAnimated.AnimatedInterpolation<number>,
    dragX: RNAnimated.AnimatedInterpolation<number>
  ) => {
    const translateX = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [0, 80],
      extrapolate: 'clamp',
    })

    return (
      <RNAnimated.View
        style={{
          width: 80,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.dangerBg,
          transform: [{ translateX }],
        }}
      >
        <AnimatedPressable
          testID={`${testID ?? 'row'}-swipe-delete`}
          onPress={handleSwipeDelete}
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%' }}
        >
          <Trash2 size={20} color={colors.dangerText} />
          <Text
            style={{
              color: colors.dangerText,
              fontSize: typography.xs.fontSize,
              fontWeight: typography.weight.semibold,
              marginTop: spacing[0.5],
            }}
          >
            Delete
          </Text>
        </AnimatedPressable>
      </RNAnimated.View>
    )
  }

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      overshootRight={false}
    >
      <View
        style={{
          paddingVertical: spacing[2.5],
          paddingHorizontal: spacing[3],
          borderBottomWidth: 1,
          borderBottomColor: colors.borderSubtle,
          backgroundColor: colors.surfacePrimary,
        }}
        testID={testID}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              fontSize: typography.base.fontSize,
              lineHeight: typography.base.lineHeight,
              fontWeight: typography.weight.semibold,
              color: colors.textPrimary,
              flex: 1,
              marginRight: spacing[2],
            }}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          <AnimatedPressable
            testID={`${testID ?? 'row'}-remove`}
            onPress={() => onRemove(item.id)}
            style={{ padding: spacing[1] }}
          >
            <Trash2 size={18} color={colors.error} />
          </AnimatedPressable>
        </View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: spacing[1.5],
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: colors.borderPrimary,
              borderRadius: radii.md,
              overflow: 'hidden',
            }}
          >
            <AnimatedPressable
              testID={`${testID ?? 'row'}-minus`}
              style={{
                width: 48,
                height: 48,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.bgSecondary,
              }}
              onPress={handleMinus}
            >
              <Minus size={18} color={colors.textPrimary} />
            </AnimatedPressable>
            <Text
              style={{
                fontSize: typography.base.fontSize,
                lineHeight: typography.base.lineHeight,
                fontWeight: typography.weight.semibold,
                color: colors.textPrimary,
                minWidth: 48,
                textAlign: 'center',
                paddingHorizontal: spacing[2],
              }}
            >
              {quantityDisplay}
            </Text>
            <AnimatedPressable
              testID={`${testID ?? 'row'}-plus`}
              style={{
                width: 48,
                height: 48,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.bgSecondary,
              }}
              onPress={handlePlus}
            >
              <Plus size={18} color={colors.textPrimary} />
            </AnimatedPressable>
          </View>
        </View>
        {showStockError && (
          <Text
            style={{
              fontSize: typography.sm.fontSize,
              lineHeight: typography.sm.lineHeight,
              color: colors.error,
              marginTop: spacing[1],
            }}
          >
            Exceeds stock
          </Text>
        )}
      </View>
    </Swipeable>
  )
}
