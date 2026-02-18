import React from 'react'
import { Stack } from 'expo-router'
import { AuthProvider } from '@/contexts/AuthContext'
import { DomainProvider } from '@/contexts/DomainContext'
import { SettingsProvider } from '@/contexts/SettingsContext'

export default function RootLayout() {
  return (
    <AuthProvider>
      <DomainProvider>
        <SettingsProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="domain-picker" />
            <Stack.Screen name="(app)" />
          </Stack>
        </SettingsProvider>
      </DomainProvider>
    </AuthProvider>
  )
}
