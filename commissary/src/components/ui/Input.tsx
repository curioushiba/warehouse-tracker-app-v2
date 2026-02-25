import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '@/theme/ThemeContext';

export interface InputProps
  extends Omit<TextInputProps, 'value' | 'onChangeText' | 'placeholder' | 'style'> {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  icon,
  keyboardType,
  secureTextEntry,
  multiline,
  disabled,
  ...rest
}: InputProps) {
  const { colors, spacing, radii, typePresets, fontFamily } = useTheme();
  const [focused, setFocused] = useState(false);

  const handleFocus = useCallback(() => setFocused(true), []);
  const handleBlur = useCallback(() => setFocused(false), []);

  const borderColor = error
    ? colors.error
    : focused
      ? colors.borderAccent
      : colors.border;

  const inputContainerStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor,
    borderRadius: radii.md,
    backgroundColor: disabled ? colors.surfaceSecondary : colors.surface,
    paddingHorizontal: spacing[3],
    minHeight: multiline ? 100 : 44,
  };

  return (
    <View style={{ gap: spacing[1] }}>
      {label && (
        <Text
          style={{
            ...typePresets.label,
            color: colors.text,
            marginBottom: spacing[1],
          }}
        >
          {label}
        </Text>
      )}
      <View style={inputContainerStyle}>
        {icon && <View style={{ marginRight: spacing[2] }}>{icon}</View>}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          multiline={multiline}
          editable={!disabled}
          onFocus={handleFocus}
          onBlur={handleBlur}
          textAlignVertical={multiline ? 'top' : 'center'}
          accessibilityLabel={label ?? placeholder}
          accessibilityState={{ disabled: !!disabled }}
          {...rest}
          style={{
            flex: 1,
            color: colors.text,
            fontFamily: fontFamily.body,
            fontSize: typePresets.body.fontSize,
            lineHeight: typePresets.body.lineHeight,
            paddingVertical: spacing[2],
          }}
        />
      </View>
      {error && (
        <Text
          style={{
            ...typePresets.caption,
            color: colors.error,
            marginTop: spacing[1],
          }}
        >
          {error}
        </Text>
      )}
    </View>
  );
}
