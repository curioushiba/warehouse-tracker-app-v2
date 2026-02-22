import React, { useCallback, useState } from 'react';
import { View, Text, TextInput } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeContext';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';

export interface QuantityControlProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  decimals?: number;
  unit?: string;
}

export function QuantityControl({
  value,
  onChange,
  min = 1,
  max = 9999.999,
  step = 1,
  decimals = 0,
  unit,
}: QuantityControlProps) {
  const { colors, spacing, radii, typePresets, fontFamily } = useTheme();
  const [editing, setEditing] = useState(false);
  const [textValue, setTextValue] = useState('');

  const handleDecrement = useCallback(() => {
    const next = Math.max(min, value - step);
    onChange(Number(next.toFixed(decimals)));
  }, [value, min, step, decimals, onChange]);

  const handleIncrement = useCallback(() => {
    const next = Math.min(max, value + step);
    onChange(Number(next.toFixed(decimals)));
  }, [value, max, step, decimals, onChange]);

  const handleStartEdit = useCallback(() => {
    setTextValue(String(value));
    setEditing(true);
  }, [value]);

  const handleEndEdit = useCallback(() => {
    setEditing(false);
    const parsed = parseFloat(textValue);
    if (!isNaN(parsed) && parsed >= min && parsed <= max) {
      onChange(Number(parsed.toFixed(decimals)));
    }
  }, [textValue, min, max, decimals, onChange]);

  const buttonSize = 36;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
      <AnimatedPressable
        onPress={handleDecrement}
        hapticPattern="light"
        disabled={value <= min}
        style={{
          width: buttonSize,
          height: buttonSize,
          borderRadius: buttonSize / 2,
          backgroundColor: value <= min ? colors.surfaceSecondary : colors.primaryLight,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Minus size={16} color={value <= min ? colors.textTertiary : colors.primary} />
      </AnimatedPressable>

      {editing ? (
        <TextInput
          value={textValue}
          onChangeText={setTextValue}
          onBlur={handleEndEdit}
          onSubmitEditing={handleEndEdit}
          keyboardType="decimal-pad"
          autoFocus
          selectTextOnFocus
          style={{
            minWidth: 48,
            textAlign: 'center',
            color: colors.text,
            fontFamily: fontFamily.bodySemiBold,
            fontSize: typePresets.body.fontSize,
            borderBottomWidth: 1,
            borderBottomColor: colors.primary,
            paddingVertical: 2,
          }}
        />
      ) : (
        <AnimatedPressable onPress={handleStartEdit} hapticPattern="light">
          <Text
            style={{
              ...typePresets.body,
              color: colors.text,
              fontWeight: '600',
              minWidth: 48,
              textAlign: 'center',
            }}
          >
            {value}{unit ? ` ${unit}` : ''}
          </Text>
        </AnimatedPressable>
      )}

      <AnimatedPressable
        onPress={handleIncrement}
        hapticPattern="light"
        disabled={value >= max}
        style={{
          width: buttonSize,
          height: buttonSize,
          borderRadius: buttonSize / 2,
          backgroundColor: value >= max ? colors.surfaceSecondary : colors.primaryLight,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Plus size={16} color={value >= max ? colors.textTertiary : colors.primary} />
      </AnimatedPressable>
    </View>
  );
}
