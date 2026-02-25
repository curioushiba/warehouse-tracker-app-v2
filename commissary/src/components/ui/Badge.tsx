import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info';

export interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

export function Badge({ label, variant = 'default' }: BadgeProps) {
  const { colors, radii, spacing, typePresets } = useTheme();

  const variantColors: Record<BadgeVariant, { bg: string; text: string }> = {
    default: { bg: colors.surfaceSecondary, text: colors.textSecondary },
    success: { bg: colors.successBackground, text: colors.success },
    warning: { bg: colors.warningBackground, text: colors.warning },
    error: { bg: colors.errorBackground, text: colors.error },
    info: { bg: colors.infoBackground, text: colors.info },
  };

  const vc = variantColors[variant];

  return (
    <View
      style={{
        backgroundColor: vc.bg,
        borderRadius: radii.full,
        paddingHorizontal: spacing[2],
        paddingVertical: spacing[1],
        alignSelf: 'flex-start',
      }}
      accessibilityRole="text"
      accessibilityLabel={label}
    >
      <Text
        style={{
          ...typePresets.caption,
          color: vc.text,
          fontWeight: '600',
        }}
      >
        {label}
      </Text>
    </View>
  );
}
