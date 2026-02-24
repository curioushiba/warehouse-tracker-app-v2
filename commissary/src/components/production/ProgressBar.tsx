import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';

interface ProgressBarProps {
  progress: number; // 0-1
  color?: string;
  height?: number;
}

export function ProgressBar({ progress, color, height = 8 }: ProgressBarProps) {
  const { colors, radii } = useTheme();

  const clampedProgress = Math.max(0, Math.min(progress, 1));
  const barColor = color ?? colors.primary;

  return (
    <View
      style={{
        height,
        borderRadius: radii.full,
        backgroundColor: colors.surfaceSecondary,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          height: '100%',
          width: `${clampedProgress * 100}%`,
          borderRadius: radii.full,
          backgroundColor: barColor,
        }}
      />
    </View>
  );
}
