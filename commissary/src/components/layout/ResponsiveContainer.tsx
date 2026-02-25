import React from 'react';
import { View, type ViewStyle } from 'react-native';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  maxWidth?: number;
  style?: ViewStyle;
}

export function ResponsiveContainer({ children, maxWidth, style }: ResponsiveContainerProps) {
  const layout = useResponsiveLayout();
  const effectiveMaxWidth = maxWidth ?? layout.contentMaxWidth;

  if (!layout.isTablet) {
    return <View style={style}>{children}</View>;
  }

  return (
    <View
      style={[
        {
          maxWidth: effectiveMaxWidth,
          width: '100%',
          alignSelf: 'center',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
