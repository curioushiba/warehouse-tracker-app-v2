import React from 'react';
import { View, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';

export type CardVariant = 'default' | 'elevated' | 'outlined';

export interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: CardVariant;
}

export function Card({ children, style, variant = 'default' }: CardProps) {
  const { colors, radii, spacing, shadows } = useTheme();

  const baseStyle: ViewStyle = {
    borderRadius: radii.lg,
    padding: spacing[4],
  };

  const variantStyles: Record<CardVariant, ViewStyle> = {
    default: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    elevated: {
      backgroundColor: colors.surface,
      ...shadows.md,
    },
    outlined: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: colors.border,
    },
  };

  return (
    <View style={[baseStyle, variantStyles[variant], style]}>
      {children}
    </View>
  );
}
