import React from 'react'
import { Stack } from 'expo-router'
import { useFonts } from 'expo-font'
import * as SplashScreen from 'expo-splash-screen'
import { AuthProvider } from '@/contexts/AuthContext'
import { DomainProvider } from '@/contexts/DomainContext'
import { SettingsProvider } from '@/contexts/SettingsContext'
import { ThemeProvider } from '@/theme/ThemeContext'

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Outfit: require('../../assets/fonts/Outfit-Regular.ttf'),
    'Outfit-Medium': require('../../assets/fonts/Outfit-Medium.ttf'),
    'Outfit-SemiBold': require('../../assets/fonts/Outfit-SemiBold.ttf'),
    'Outfit-Bold': require('../../assets/fonts/Outfit-Bold.ttf'),
    WorkSans: require('../../assets/fonts/WorkSans-Regular.ttf'),
    'WorkSans-Medium': require('../../assets/fonts/WorkSans-Medium.ttf'),
    'WorkSans-SemiBold': require('../../assets/fonts/WorkSans-SemiBold.ttf'),
    'WorkSans-Bold': require('../../assets/fonts/WorkSans-Bold.ttf'),
  })

  React.useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync()
    }
  }, [fontsLoaded, fontError])

  if (!fontsLoaded && !fontError) return null

  return (
    <AuthProvider>
      <DomainProvider>
        <SettingsProvider>
          <ThemeProvider>
            <Stack
              screenOptions={{
                headerShown: false,
                animation: 'fade',
                animationDuration: 250,
              }}
            >
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="domain-picker" />
              <Stack.Screen name="(app)" />
            </Stack>
          </ThemeProvider>
        </SettingsProvider>
      </DomainProvider>
    </AuthProvider>
  )
}
