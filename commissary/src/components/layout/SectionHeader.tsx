import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';

export interface SectionHeaderProps {
  title: string;
  action?: { label: string; onPress: () => void };
}

export function SectionHeader({ title, action }: SectionHeaderProps) {
  const { colors, spacing, typePresets } = useTheme();

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
      <Text style={{ ...typePresets.label, color: colors.textSecondary }}>
        {title}
      </Text>
      {action && (
        <Pressable onPress={action.onPress}>
          <Text
            style={{
              ...typePresets.bodySmall,
              color: colors.primary,
              fontWeight: '600',
            }}
          >
            {action.label}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
