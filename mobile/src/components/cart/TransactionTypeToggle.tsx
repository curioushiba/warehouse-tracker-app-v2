import React from 'react';
import { View, Text } from 'react-native';
import { ArrowDownToLine, ArrowUpFromLine } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeContext';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import type { TransactionType } from '@/lib/types';

export interface TransactionTypeToggleProps {
  value: TransactionType;
  onChange: (type: TransactionType) => void;
}

export function TransactionTypeToggle({ value, onChange }: TransactionTypeToggleProps) {
  const { colors, spacing, radii, typePresets } = useTheme();

  return (
    <View style={{ paddingHorizontal: spacing[4], paddingVertical: spacing[2] }}>
      <View style={{ flexDirection: 'row', gap: spacing[2] }}>
        <AnimatedPressable
          onPress={() => onChange('check_in')}
          hapticPattern="light"
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing[2],
            paddingVertical: spacing[3],
            borderRadius: radii.md,
            backgroundColor:
              value === 'check_in'
                ? colors.successBackground
                : colors.surfaceSecondary,
            borderWidth: value === 'check_in' ? 2 : 1,
            borderColor:
              value === 'check_in'
                ? colors.success
                : colors.border,
          }}
        >
          <ArrowDownToLine
            size={20}
            color={
              value === 'check_in'
                ? colors.success
                : colors.textSecondary
            }
          />
          <Text
            style={{
              ...typePresets.label,
              color:
                value === 'check_in'
                  ? colors.success
                  : colors.textSecondary,
            }}
          >
            Stock In
          </Text>
        </AnimatedPressable>

        <AnimatedPressable
          onPress={() => onChange('check_out')}
          hapticPattern="light"
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing[2],
            paddingVertical: spacing[3],
            borderRadius: radii.md,
            backgroundColor:
              value === 'check_out'
                ? colors.errorBackground
                : colors.surfaceSecondary,
            borderWidth: value === 'check_out' ? 2 : 1,
            borderColor:
              value === 'check_out'
                ? colors.error
                : colors.border,
          }}
        >
          <ArrowUpFromLine
            size={20}
            color={
              value === 'check_out'
                ? colors.error
                : colors.textSecondary
            }
          />
          <Text
            style={{
              ...typePresets.label,
              color:
                value === 'check_out'
                  ? colors.error
                  : colors.textSecondary,
            }}
          >
            Stock Out
          </Text>
        </AnimatedPressable>
      </View>
    </View>
  );
}
