import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  rightAction?: React.ReactNode;
}

export function ScreenHeader({ title, subtitle, rightAction }: ScreenHeaderProps) {
  const { colors, spacing, typePresets } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing[4],
        paddingVertical: spacing[3],
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ ...typePresets.heading, color: colors.text }}>
          {title}
        </Text>
        {subtitle && (
          <Text
            style={{
              ...typePresets.bodySmall,
              color: colors.textSecondary,
              marginTop: spacing[1],
            }}
          >
            {subtitle}
          </Text>
        )}
      </View>
      {rightAction && <View style={{ marginLeft: spacing[3] }}>{rightAction}</View>}
    </View>
  );
}
