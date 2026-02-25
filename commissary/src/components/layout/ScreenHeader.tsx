import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  rightAction?: React.ReactNode;
  headerColor?: string;
}

export function ScreenHeader({ title, subtitle, rightAction, headerColor }: ScreenHeaderProps) {
  const { colors, spacing, typePresets, radii } = useTheme();

  const titleColor = headerColor ? colors.textInverse : colors.text;
  const subtitleColor = headerColor ? colors.textInverse : colors.textSecondary;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing[4],
        paddingVertical: spacing[3],
        ...(headerColor && {
          backgroundColor: headerColor,
          borderBottomLeftRadius: radii.lg,
          borderBottomRightRadius: radii.lg,
        }),
      }}
    >
      <View style={{ flex: 1 }}>
        <Text
          style={{ ...typePresets.heading, color: titleColor }}
          accessibilityRole="header"
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            style={{
              ...typePresets.bodySmall,
              color: subtitleColor,
              opacity: headerColor ? 0.8 : 1,
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
