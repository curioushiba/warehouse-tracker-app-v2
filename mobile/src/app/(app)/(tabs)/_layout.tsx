import React from 'react'
import { Tabs } from 'expo-router'
import { Home, ScanLine, ClipboardList, UserCircle } from 'lucide-react-native'
import { useTheme } from '@/theme'
import { hapticSelection } from '@/lib/haptics'

export default function TabsLayout() {
  const { colors, spacing, shadows, fontFamily } = useTheme()

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brandPrimary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          height: 64,
          backgroundColor: colors.surfacePrimary,
          borderTopColor: colors.borderSubtle,
          borderTopWidth: 1,
          paddingBottom: spacing[2],
          paddingTop: spacing[1],
          ...shadows.md,
        },
        tabBarLabelStyle: {
          fontFamily: fontFamily.body,
          fontSize: 11,
        },
      }}
      screenListeners={{
        tabPress: () => {
          hapticSelection()
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scan',
          tabBarIcon: ({ color, size }) => <ScanLine size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, size }) => <ClipboardList size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <UserCircle size={size} color={color} />,
        }}
      />
    </Tabs>
  )
}
