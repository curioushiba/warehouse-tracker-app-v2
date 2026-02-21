import React from 'react';
import { ActivityIndicator, View, Text, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { AnimatedPressable } from './AnimatedPressable';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  variant?: ButtonVariant;
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  size?: ButtonSize;
}

const SIZE_CONFIG: Record<ButtonSize, { height: number; paddingHorizontal: number; fontSize: number }> = {
  sm: { height: 36, paddingHorizontal: 12, fontSize: 14 },
  md: { height: 44, paddingHorizontal: 16, fontSize: 16 },
  lg: { height: 52, paddingHorizontal: 20, fontSize: 18 },
};

export function Button({
  variant = 'primary',
  title,
  onPress,
  disabled = false,
  loading = false,
  icon,
  size = 'md',
}: ButtonProps) {
  const { colors, radii, fontFamily } = useTheme();
  const sizeConfig = SIZE_CONFIG[size];

  const variantStyles: Record<ButtonVariant, { bg: string; text: string; border?: string }> = {
    primary: { bg: colors.primary, text: colors.textInverse },
    secondary: { bg: colors.surfaceSecondary, text: colors.text },
    ghost: { bg: 'transparent', text: colors.primary },
    danger: { bg: colors.error, text: colors.textInverse },
  };

  const vs = variantStyles[variant];
  const isDisabled = disabled || loading;

  const containerStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: sizeConfig.height,
    paddingHorizontal: sizeConfig.paddingHorizontal,
    backgroundColor: vs.bg,
    borderRadius: radii.md,
    opacity: isDisabled ? 0.5 : 1,
    ...(variant === 'ghost' ? {} : {}),
    ...(vs.border ? { borderWidth: 1, borderColor: vs.border } : {}),
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={isDisabled}
      style={containerStyle}
    >
      {loading ? (
        <ActivityIndicator size="small" color={vs.text} />
      ) : (
        <>
          {icon && <View style={{ marginRight: 8 }}>{icon}</View>}
          <Text
            style={{
              color: vs.text,
              fontSize: sizeConfig.fontSize,
              fontFamily: fontFamily.bodySemiBold,
              fontWeight: '600',
            }}
          >
            {title}
          </Text>
        </>
      )}
    </AnimatedPressable>
  );
}
