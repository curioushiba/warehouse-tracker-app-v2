import React, { Component, type ReactNode } from 'react';
import { View, Text } from 'react-native';
import { lightColors, spacing, radii, typePresets } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeContext';
import { AnimatedPressable } from './ui/AnimatedPressable';
import type { SemanticColors } from '@/theme/tokens';

// Functional fallback component that tries useTheme(), falls back to lightColors
function ErrorFallback({
  error,
  onRetry,
}: {
  error: Error | null;
  onRetry: () => void;
}) {
  let colors: SemanticColors;
  try {
    const theme = useTheme();
    colors = theme.colors;
  } catch {
    colors = lightColors;
  }

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing[6],
        backgroundColor: colors.background,
      }}
    >
      <Text
        style={{
          ...typePresets.title,
          color: colors.text,
          marginBottom: spacing[2],
        }}
        accessibilityRole="header"
      >
        Something went wrong
      </Text>
      <Text
        style={{
          ...typePresets.bodySmall,
          color: colors.textSecondary,
          textAlign: 'center',
          marginBottom: spacing[6],
        }}
      >
        {error?.message ?? 'An unexpected error occurred'}
      </Text>
      <AnimatedPressable
        onPress={onRetry}
        hapticPattern="light"
        accessibilityRole="button"
        accessibilityLabel="Retry"
        style={{
          backgroundColor: colors.primary,
          paddingHorizontal: spacing[6],
          paddingVertical: spacing[3],
          borderRadius: radii.md,
          minHeight: 44,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            ...typePresets.body,
            color: colors.textInverse,
            fontWeight: '600',
          }}
        >
          Retry
        </Text>
      </AnimatedPressable>
    </View>
  );
}

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <ErrorFallback error={this.state.error} onRetry={this.handleRetry} />
      );
    }

    return this.props.children;
  }
}
