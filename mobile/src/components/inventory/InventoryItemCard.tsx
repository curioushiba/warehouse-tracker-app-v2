import React from 'react';
import { View, Text } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
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
}

export function InventoryItemCard({ item, onQuickIn, onQuickOut, onPress }: InventoryItemCardProps) {
  const { colors, spacing, typePresets, radii } = useTheme();

  const isLowStock = item.current_stock > 0 && item.current_stock < item.min_stock;
  const isOutOfStock = item.current_stock <= 0;

  const BUTTON_SIZE = 36;

  return (
    <AnimatedPressable
      onPress={onPress ? () => onPress(item.id) : undefined}
      disabled={!onPress}
      hapticPattern="light"
      style={{ marginHorizontal: spacing[4], marginBottom: spacing[2] }}
    >
      <Card variant="elevated">
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
              hapticPattern="medium"
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

            <Text
              style={{
                ...typePresets.title,
                color: colors.text,
                fontWeight: '700',
                textAlign: 'center',
                minWidth: 40,
              }}
            >
              {item.current_stock}
            </Text>

            <AnimatedPressable
              onPress={() => onQuickIn(item.id)}
              hapticPattern="medium"
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
      </Card>
    </AnimatedPressable>
  );
}
