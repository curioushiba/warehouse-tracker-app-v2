import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { Button } from './Button';

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  message: string;
  action?: { label: string; onPress: () => void };
}

export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  const { colors, spacing, typePresets } = useTheme();

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing[8],
      }}
    >
      <View style={{ marginBottom: spacing[4] }}>{icon}</View>
      <Text
        style={{
          ...typePresets.title,
          color: colors.text,
          textAlign: 'center',
          marginBottom: spacing[2],
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          ...typePresets.body,
          color: colors.textSecondary,
          textAlign: 'center',
          marginBottom: spacing[6],
        }}
      >
        {message}
      </Text>
      {action && (
        <Button
          variant="primary"
          title={action.label}
          onPress={action.onPress}
        />
      )}
    </View>
  );
}
