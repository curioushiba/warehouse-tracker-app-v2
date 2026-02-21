import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';

export type SpinnerSize = 'sm' | 'md' | 'lg';

export interface LoadingSpinnerProps {
  size?: SpinnerSize;
  color?: string;
}

const SIZE_MAP: Record<SpinnerSize, 'small' | 'large'> = {
  sm: 'small',
  md: 'small',
  lg: 'large',
};

const SCALE_MAP: Record<SpinnerSize, number> = {
  sm: 0.8,
  md: 1,
  lg: 1,
};

export function LoadingSpinner({ size = 'md', color }: LoadingSpinnerProps) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ scale: SCALE_MAP[size] }],
      }}
    >
      <ActivityIndicator size={SIZE_MAP[size]} color={color ?? colors.primary} />
    </View>
  );
}
