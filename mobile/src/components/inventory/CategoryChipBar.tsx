import React from 'react';
import { ScrollView, Text } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';

export interface CategoryChipBarProps {
  categories: string[];
  selected: string | null;
  onSelect: (category: string | null) => void;
}

export function CategoryChipBar({ categories, selected, onSelect }: CategoryChipBarProps) {
  const { colors, spacing, radii, typePresets } = useTheme();

  const chips = ['All', ...categories];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: spacing[4],
        gap: spacing[2],
      }}
      style={{ flexGrow: 0 }}
    >
      {chips.map((chip) => {
        const isAll = chip === 'All';
        const isActive = isAll ? selected === null : selected === chip;

        return (
          <AnimatedPressable
            key={chip}
            onPress={() => onSelect(isAll ? null : chip)}
            hapticPattern="light"
            style={{
              paddingHorizontal: spacing[3],
              paddingVertical: spacing[1],
              borderRadius: radii.full,
              backgroundColor: isActive
                ? colors.primary
                : colors.surfaceSecondary,
            }}
          >
            <Text
              style={{
                ...typePresets.label,
                color: isActive
                  ? colors.textInverse
                  : colors.textSecondary,
              }}
            >
              {chip}
            </Text>
          </AnimatedPressable>
        );
      })}
    </ScrollView>
  );
}
