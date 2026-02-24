import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { BadgeVariant } from '@/components/ui/Badge';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { ProgressBar } from './ProgressBar';
import type { PriorityLevel } from '@/lib/types';

interface ProductionItemCardProps {
  item: { id: string; name: string; unit: string; current_stock: number };
  target: number;
  produced: number;
  priority: PriorityLevel;
  onPress: () => void;
}

const PRIORITY_BADGE_VARIANT: Record<PriorityLevel, BadgeVariant> = {
  CRITICAL: 'error',
  URGENT: 'warning',
  HIGH: 'info',
  NORMAL: 'default',
};

export function ProductionItemCard({
  item,
  target,
  produced,
  priority,
  onPress,
}: ProductionItemCardProps) {
  const { colors, spacing, typePresets } = useTheme();

  const progress = target > 0 ? Math.min(produced / target, 1) : 0;
  const progressColor = progress >= 1 ? colors.success : colors.primary;

  return (
    <AnimatedPressable onPress={onPress} hapticPattern="light">
      <Card>
        <View style={{ gap: spacing[2] }}>
          {/* Row: name + priority badge */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Text
              style={{ ...typePresets.label, color: colors.text, flex: 1 }}
              numberOfLines={1}
            >
              {item.name}
            </Text>
            <Badge label={priority} variant={PRIORITY_BADGE_VARIANT[priority]} />
          </View>

          {/* Progress bar */}
          {target > 0 && (
            <ProgressBar progress={progress} color={progressColor} />
          )}

          {/* Row: quantity + stock */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Text style={{ ...typePresets.bodySmall, color: colors.textSecondary }}>
              {produced} / {target} {item.unit}
            </Text>
            <Text style={{ ...typePresets.caption, color: colors.textTertiary }}>
              Stock: {item.current_stock}
            </Text>
          </View>
        </View>
      </Card>
    </AnimatedPressable>
  );
}
