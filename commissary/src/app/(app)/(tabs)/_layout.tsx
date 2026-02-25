import React from 'react';
import { Tabs } from 'expo-router';
import {
  Home,
  ChefHat,
  UserCircle,
} from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hapticSelection } from '@/lib/haptics';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';

export default function TabsLayout() {
  const { colors, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const { isTablet } = useResponsiveLayout();

  const tabBarHeight = isTablet ? 72 : 64;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          height: tabBarHeight + insets.bottom,
          paddingBottom: insets.bottom,
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          ...shadows.sm,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginBottom: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
        listeners={{ tabPress: () => hapticSelection() }}
      />
      <Tabs.Screen
        name="produce"
        options={{
          title: 'Produce',
          tabBarIcon: ({ color, size }) => (
            <ChefHat size={size} color={color} />
          ),
        }}
        listeners={{ tabPress: () => hapticSelection() }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <UserCircle size={size} color={color} />
          ),
        }}
        listeners={{ tabPress: () => hapticSelection() }}
      />
    </Tabs>
  );
}
