import React from 'react';
import { View, Text } from 'react-native';
import { ArrowDown, ArrowUp, Check, Minus, Plus } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeContext';
import type { CachedItem } from '@/lib/db/types';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';

export interface InventoryItemCardProps {
  item: CachedItem;
  onQuickIn: (itemId: string) => void;
  onQuickOut: (itemId: string) => void;
  onPress?: (itemId: string) => void;
  pendingDelta?: number;
  displayStock?: number;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export function InventoryItemCard({
  item,
  onQuickIn,
  onQuickOut,
  onPress,
  pendingDelta,
  displayStock,
  onConfirm,
  onCancel,
}: InventoryItemCardProps) {
  const { colors, spacing, typePresets, radii, shadows } = useTheme();

  const stock = displayStock ?? item.current_stock;
  const isPending = pendingDelta != null && pendingDelta !== 0;
  const isLowStock = stock > 0 && stock < item.min_stock;
  const isOutOfStock = stock <= 0;

  const BUTTON_SIZE = 36;

  return (
    <AnimatedPressable
      onPress={onPress ? () => onPress(item.id) : undefined}
      disabled={!onPress}
      hapticPattern="light"
      style={{ marginHorizontal: spacing[4], marginBottom: spacing[2] }}
    >
      <Card
        variant="elevated"
        style={isPending ? {
          backgroundColor: colors.warningBackground,
          borderLeftWidth: 3,
          borderLeftColor: colors.warning,
          ...shadows.lg,
        } : undefined}
      >
        {/* Row 1: Item info + stock controls */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
          <View style={{ flex: 1 }}>
            <Text
              style={{ ...typePresets.bodySmall, color: colors.text, fontWeight: '600' }}
              numberOfLines={1}
            >
              {item.name}
            </Text>
            <Text
              style={{
                ...typePresets.caption,
                color: colors.textSecondary,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              SKU: {item.sku}
            </Text>
            {isLowStock && (
              <Badge label="LOW STOCK" variant="warning" />
            )}
            {isOutOfStock && (
              <Badge label="OUT OF STOCK" variant="error" />
            )}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
            <AnimatedPressable
              onPress={() => onQuickOut(item.id)}
              hapticPattern="light"
              style={{
                width: BUTTON_SIZE,
                height: BUTTON_SIZE,
                borderRadius: radii.full,
                borderWidth: 1.5,
                borderColor: colors.error,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Minus size={18} color={colors.error} />
            </AnimatedPressable>

            <View style={{ alignItems: 'center', minWidth: 40 }}>
              <Text
                style={{
                  ...typePresets.title,
                  color: colors.text,
                  fontWeight: '700',
                  textAlign: 'center',
                }}
              >
                {stock}
              </Text>
            </View>

            <AnimatedPressable
              onPress={() => onQuickIn(item.id)}
              hapticPattern="light"
              style={{
                width: BUTTON_SIZE,
                height: BUTTON_SIZE,
                borderRadius: radii.full,
                backgroundColor: colors.success,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Plus size={18} color={colors.textInverse} />
            </AnimatedPressable>
          </View>
        </View>

        {/* Row 2: Action bar (pending only) */}
        {isPending && (
          <>
            <View style={{
              height: 1,
              backgroundColor: colors.border,
              marginVertical: spacing[3],
            }} />

            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              {/* Delta indicator */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1] }}>
                {pendingDelta! > 0 ? (
                  <ArrowUp size={16} color={colors.success} />
                ) : (
                  <ArrowDown size={16} color={colors.error} />
                )}
                <Text style={{
                  ...typePresets.bodySmall,
                  fontWeight: '700',
                  color: pendingDelta! > 0 ? colors.success : colors.error,
                }}>
                  {pendingDelta! > 0 ? `+${pendingDelta}` : pendingDelta} units
                </Text>
              </View>

              {/* Confirm + Cancel buttons */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
                <AnimatedPressable
                  onPress={onCancel}
                  hapticPattern="warning"
                  style={{
                    height: 36,
                    paddingHorizontal: spacing[3],
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{
                    ...typePresets.bodySmall,
                    fontWeight: '600',
                    color: colors.textSecondary,
                  }}>
                    Cancel
                  </Text>
                </AnimatedPressable>

                <AnimatedPressable
                  onPress={onConfirm}
                  hapticPattern="success"
                  style={{
                    height: 36,
                    paddingHorizontal: spacing[4],
                    borderRadius: radii.full,
                    backgroundColor: colors.success,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: spacing[1],
                  }}
                >
                  <Check size={16} color={colors.textInverse} />
                  <Text style={{
                    ...typePresets.bodySmall,
                    fontWeight: '700',
                    color: colors.textInverse,
                  }}>
                    Confirm
                  </Text>
                </AnimatedPressable>
              </View>
            </View>
          </>
        )}
      </Card>
    </AnimatedPressable>
  );
}
