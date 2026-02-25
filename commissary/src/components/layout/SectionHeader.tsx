import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';

export interface SectionHeaderProps {
  title: string;
  action?: { label: string; onPress: () => void };
}

export function SectionHeader({ title, action }: SectionHeaderProps) {
  const { colors, spacing, typePresets, touchTarget } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing[4],
        paddingVertical: spacing[2],
      }}
    >
      <Text
        style={{ ...typePresets.label, color: colors.textSecondary }}
        accessibilityRole="header"
      >
        {title}
      </Text>
      {action && (
        <AnimatedPressable
          onPress={action.onPress}
          hapticPattern="light"
          accessibilityRole="button"
          accessibilityLabel={action.label}
          style={{
            minHeight: touchTarget.minHeight,
            paddingHorizontal: spacing[2],
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              ...typePresets.bodySmall,
              color: colors.primary,
              fontWeight: '600',
            }}
          >
            {action.label}
          </Text>
        </AnimatedPressable>
      )}
    </View>
  );
}
