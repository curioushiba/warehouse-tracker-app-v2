import React from 'react';
import { View, Text } from 'react-native';
import { ArrowDown, ArrowUp, Check, Minus, Plus } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeContext';
import type { CachedItem } from '@/lib/db/types';
import { Card } from '@/components/ui/Card';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { ProgressBar } from '@/components/production/ProgressBar';

export interface ProduceItemCardProps {
  item: CachedItem;
  target: number;
  produced: number;
  displayProduced?: number;
  pendingDelta?: number;
  onIncrement: (itemId: string) => void;
  onDecrement: (itemId: string) => void;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export function ProduceItemCard({
  item,
  target,
  produced,
  displayProduced,
  pendingDelta,
  onIncrement,
  onDecrement,
  onConfirm,
  onCancel,
}: ProduceItemCardProps) {
  const { colors, spacing, typePresets, radii, shadows } = useTheme();

  const shownProduced = displayProduced ?? produced;
  const isPending = pendingDelta != null && pendingDelta !== 0;
  const progress = target > 0 ? Math.min(shownProduced / target, 1) : 0;
  const progressColor = progress >= 1 ? colors.success : colors.primary;

  const BUTTON_SIZE = 36;

  return (
    <View style={{ marginHorizontal: spacing[4], marginBottom: spacing[2] }}>
      <Card
        variant="elevated"
        style={isPending ? {
          backgroundColor: colors.warningBackground,
          borderLeftWidth: 3,
          borderLeftColor: colors.warning,
          ...shadows.lg,
        } : undefined}
      >
        {/* Row 1: Item info + production controls */}
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
              }}
            >
              Stock: {item.current_stock} {item.unit}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
            <AnimatedPressable
              onPress={() => onDecrement(item.id)}
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

            <View style={{ alignItems: 'center', minWidth: 48 }}>
              <Text
                style={{
                  ...typePresets.title,
                  color: colors.text,
                  fontWeight: '700',
                  textAlign: 'center',
                }}
              >
                {shownProduced}
              </Text>
              {target > 0 && (
                <Text
                  style={{
                    ...typePresets.caption,
                    color: colors.textTertiary,
                    textAlign: 'center',
                  }}
                >
                  /{target}
                </Text>
              )}
            </View>

            <AnimatedPressable
              onPress={() => onIncrement(item.id)}
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

        {/* Progress bar */}
        {target > 0 && (
          <View style={{ marginTop: spacing[2] }}>
            <ProgressBar progress={progress} color={progressColor} height={6} />
          </View>
        )}

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
                  {pendingDelta! > 0 ? `+${pendingDelta}` : pendingDelta} {item.unit}
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
    </View>
  );
}
