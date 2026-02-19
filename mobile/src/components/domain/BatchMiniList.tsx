import React from 'react'
import { View, Text } from 'react-native'
import { useTheme } from '@/theme'

export interface BatchMiniListItem {
  id: string
  name: string
  quantity: number
}

export interface BatchMiniListProps {
  items: BatchMiniListItem[]
  maxVisibleItems?: number
  testID?: string
}

export function BatchMiniList({
  items,
  maxVisibleItems = 4,
  testID,
}: BatchMiniListProps) {
  const { colors, spacing, typography, radii } = useTheme()
  const visibleItems = items.slice(0, maxVisibleItems)
  const overflowCount = items.length - maxVisibleItems

  return (
    <View style={{ padding: spacing[3] }} testID={testID}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing[2], gap: spacing[2] }}>
        <Text
          style={{
            fontSize: typography.base.fontSize,
            lineHeight: typography.base.lineHeight,
            fontWeight: typography.weight.semibold,
            color: colors.textPrimary,
          }}
        >
          {items.length === 0
            ? 'No items added'
            : `${items.length} ${items.length === 1 ? 'item' : 'items'}`}
        </Text>
        {items.length > 0 && (
          <View
            testID={testID ? `${testID}-count-badge` : undefined}
            style={{
              minWidth: 22,
              height: 22,
              borderRadius: radii.full,
              backgroundColor: colors.brandPrimary,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: spacing[1.5],
            }}
          >
            <Text
              style={{
                fontSize: typography.xs.fontSize,
                fontWeight: typography.weight.bold,
                color: colors.brandText,
              }}
            >
              {items.length}
            </Text>
          </View>
        )}
      </View>
      {visibleItems.map((item) => (
        <View
          key={item.id}
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingVertical: spacing[1],
          }}
        >
          <Text
            style={{
              fontSize: typography.base.fontSize,
              lineHeight: typography.base.lineHeight,
              color: colors.textPrimary,
              flex: 1,
              marginRight: spacing[2],
            }}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          <Text
            style={{
              fontSize: typography.base.fontSize,
              lineHeight: typography.base.lineHeight,
              fontWeight: typography.weight.semibold,
              color: colors.textPrimary,
            }}
          >
            {item.quantity}
          </Text>
        </View>
      ))}
      {overflowCount > 0 && (
        <Text
          style={{
            fontSize: typography.base.fontSize,
            lineHeight: typography.base.lineHeight,
            color: colors.textSecondary,
            marginTop: spacing[1],
            fontStyle: 'italic',
          }}
        >
          +{overflowCount} more
        </Text>
      )}
    </View>
  )
}
