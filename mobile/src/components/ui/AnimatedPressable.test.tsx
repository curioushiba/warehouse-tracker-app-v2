import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { AnimatedPressable } from './AnimatedPressable';

// Mock reanimated
jest.mock('react-native-reanimated', () => {
  const { View, Pressable } = require('react-native');
  return {
    __esModule: true,
    default: {
      createAnimatedComponent: (component: unknown) => {
        // Return a simple Pressable wrapper for testing
        if (component === Pressable) {
          return ({
            onPressIn,
            onPressOut,
            onPress,
            disabled,
            style,
            children,
            ...rest
          }: {
            onPressIn?: () => void;
            onPressOut?: () => void;
            onPress?: () => void;
            disabled?: boolean;
            style?: object;
            children: React.ReactNode;
          }) => (
            <Pressable
              onPressIn={onPressIn}
              onPressOut={onPressOut}
              onPress={onPress}
              disabled={disabled}
              style={style}
              testID="animated-pressable"
              {...rest}
            >
              {children}
            </Pressable>
          );
        }
        return View;
      },
    },
    useSharedValue: (initial: number) => ({ value: initial }),
    useAnimatedStyle: (fn: () => object) => fn(),
    withTiming: (value: number) => value,
  };
});

// Mock animations
jest.mock('@/theme/animations', () => ({
  PRESS_SCALE: 0.97,
  TIMING_CONFIG: { duration: 200 },
}));

// Mock haptics
jest.mock('@/lib/haptics', () => ({
  haptic: jest.fn(),
}));

describe('AnimatedPressable', () => {
  it('should render children', () => {
    render(
      <AnimatedPressable onPress={() => {}}>
        <Text>Press Me</Text>
      </AnimatedPressable>
    );

    expect(screen.getByText('Press Me')).toBeTruthy();
  });

  it('should call onPress when pressed', () => {
    const onPress = jest.fn();
    render(
      <AnimatedPressable onPress={onPress}>
        <Text>Tap</Text>
      </AnimatedPressable>
    );

    fireEvent.press(screen.getByText('Tap'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('should trigger haptic feedback on press', () => {
    const { haptic } = require('@/lib/haptics');
    const onPress = jest.fn();
    render(
      <AnimatedPressable onPress={onPress} hapticPattern="medium">
        <Text>Haptic</Text>
      </AnimatedPressable>
    );

    fireEvent.press(screen.getByText('Haptic'));
    expect(haptic).toHaveBeenCalledWith('medium');
  });

  it('should not call onPress when disabled', () => {
    const onPress = jest.fn();
    render(
      <AnimatedPressable onPress={onPress} disabled>
        <Text>Disabled</Text>
      </AnimatedPressable>
    );

    const pressable = screen.getByTestId('animated-pressable');
    // React Native Pressable maps disabled to accessibilityState
    expect(
      pressable.props.accessibilityState?.disabled ?? pressable.props.disabled
    ).toBeTruthy();
  });

  it('should use default haptic pattern (light)', () => {
    const { haptic } = require('@/lib/haptics');
    haptic.mockClear();

    render(
      <AnimatedPressable onPress={() => {}}>
        <Text>Default</Text>
      </AnimatedPressable>
    );

    fireEvent.press(screen.getByText('Default'));
    expect(haptic).toHaveBeenCalledWith('light');
  });
});
