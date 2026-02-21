import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';

export interface StockLevelIndicatorProps {
  currentStock: number;
  minStock: number;
  maxStock?: number;
}

type StockLevel = 'critical' | 'low' | 'normal' | 'overstocked';

function getStockLevel(
  current: number,
  min: number,
  max: number | undefined,
): StockLevel {
  if (current <= 0) return 'critical';
  if (current < min) return 'low';
  if (max !== undefined && current > max) return 'overstocked';
  return 'normal';
}

export function StockLevelIndicator({
  currentStock,
  minStock,
  maxStock,
}: StockLevelIndicatorProps) {
  const { colors, spacing, radii, typePresets } = useTheme();

  const level = getStockLevel(currentStock, minStock, maxStock);

  const levelConfig: Record<StockLevel, { bg: string; text: string; label: string }> = {
    critical: { bg: colors.errorBackground, text: colors.error, label: 'Critical' },
    low: { bg: colors.warningBackground, text: colors.warning, label: 'Low' },
    normal: { bg: colors.successBackground, text: colors.success, label: 'Normal' },
    overstocked: { bg: colors.infoBackground, text: colors.info, label: 'Overstocked' },
  };

  const config = levelConfig[level];

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing[1],
      }}
    >
      <View
        style={{
          backgroundColor: config.bg,
          borderRadius: radii.full,
          paddingHorizontal: spacing[2],
          paddingVertical: 2,
        }}
      >
        <Text
          style={{
            ...typePresets.caption,
            color: config.text,
            fontWeight: '600',
          }}
        >
          {config.label}
        </Text>
      </View>
    </View>
  );
}
