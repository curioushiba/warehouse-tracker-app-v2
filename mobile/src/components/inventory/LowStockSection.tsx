import React from 'react';
import { View, ScrollView, Text } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { Card } from '@/components/ui/Card';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { StockLevelIndicator } from '@/components/indicators/StockLevelIndicator';
import type { CachedItem } from '@/lib/db/types';

export interface LowStockSectionProps {
  items: CachedItem[];
  onItemPress: (itemId: string) => void;
}

export function LowStockSection({ items, onItemPress }: LowStockSectionProps) {
  const { colors, spacing, radii, typePresets } = useTheme();

  if (items.length === 0) return null;

  return (
    <View>
      <SectionHeader title={`Needs Attention (${items.length})`} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: spacing[4],
          gap: spacing[3],
        }}
      >
        {items.map((item) => (
          <AnimatedPressable
            key={item.id}
            onPress={() => onItemPress(item.id)}
            hapticPattern="light"
          >
            <Card
              variant="outlined"
              style={{
                width: 140,
                borderRadius: radii.lg,
                padding: spacing[3],
                gap: spacing[2],
              }}
            >
              <Text
                style={{
                  ...typePresets.bodySmall,
                  color: colors.text,
                  fontWeight: '600',
                }}
                numberOfLines={1}
              >
                {item.name}
              </Text>
              <StockLevelIndicator
                currentStock={item.current_stock}
                minStock={item.min_stock}
                maxStock={item.max_stock ?? undefined}
              />
              <Text
                style={{
                  ...typePresets.caption,
                  color: colors.textSecondary,
                }}
              >
                {item.current_stock} / {item.min_stock} {item.unit}
              </Text>
              {item.category_name && (
                <Text
                  style={{
                    ...typePresets.caption,
                    color: colors.textTertiary,
                  }}
                  numberOfLines={1}
                >
                  {item.category_name}
                </Text>
              )}
            </Card>
          </AnimatedPressable>
        ))}
      </ScrollView>
    </View>
  );
}
