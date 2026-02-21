import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Button } from './Button';

// Mock the theme
jest.mock('@/theme/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      primary: '#2563EB',
      textInverse: '#FFFFFF',
      surfaceSecondary: '#F3F4F6',
      text: '#111827',
      error: '#EF4444',
    },
    radii: { md: 8 },
    fontFamily: { bodySemiBold: 'WorkSans-SemiBold' },
  }),
}));

// Mock AnimatedPressable as a simple Pressable
jest.mock('./AnimatedPressable', () => {
  const { Pressable } = require('react-native');
  return {
    AnimatedPressable: ({
      onPress,
      disabled,
      style,
      children,
      ...rest
    }: {
      onPress?: () => void;
      disabled?: boolean;
      style?: object;
      children: React.ReactNode;
    }) => (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={style}
        accessibilityRole="button"
        {...rest}
      >
        {children}
      </Pressable>
    ),
  };
});

describe('Button', () => {
  it('should render the title text', () => {
    render(<Button title="Submit" onPress={() => {}} />);
    expect(screen.getByText('Submit')).toBeTruthy();
  });

  it('should call onPress when pressed', () => {
    const onPress = jest.fn();
    render(<Button title="Click Me" onPress={onPress} />);

    fireEvent.press(screen.getByText('Click Me'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', () => {
    const onPress = jest.fn();
    render(<Button title="Disabled" onPress={onPress} disabled />);

    const button = screen.getByRole('button');
    expect(button.props.accessibilityState?.disabled || button.props.disabled).toBeTruthy();
  });

  it('should show ActivityIndicator when loading', () => {
    render(<Button title="Loading" onPress={() => {}} loading />);

    // When loading, the title should not be visible
    expect(screen.queryByText('Loading')).toBeNull();
  });

  it('should be disabled when loading', () => {
    const onPress = jest.fn();
    render(<Button title="Loading" onPress={onPress} loading />);

    const button = screen.getByRole('button');
    expect(button.props.accessibilityState?.disabled || button.props.disabled).toBeTruthy();
  });

  it('should render with an icon', () => {
    const icon = <Text testID="test-icon">icon</Text>;
    render(<Button title="With Icon" onPress={() => {}} icon={icon} />);

    expect(screen.getByTestId('test-icon')).toBeTruthy();
    expect(screen.getByText('With Icon')).toBeTruthy();
  });

  it('should render with default variant (primary)', () => {
    render(<Button title="Primary" onPress={() => {}} />);
    expect(screen.getByText('Primary')).toBeTruthy();
  });

  it('should render with danger variant', () => {
    render(<Button title="Delete" onPress={() => {}} variant="danger" />);
    expect(screen.getByText('Delete')).toBeTruthy();
  });
});
