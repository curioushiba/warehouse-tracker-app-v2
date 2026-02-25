import React, { useCallback, useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { Slot } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SQLiteProvider } from 'expo-sqlite';
import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from '@expo-google-fonts/outfit';
import {
  WorkSans_400Regular,
  WorkSans_500Medium,
  WorkSans_600SemiBold,
  WorkSans_700Bold,
} from '@expo-google-fonts/work-sans';
import { SettingsProvider, useSettings } from '@/contexts/SettingsContext';
import { ThemeProvider } from '@/theme/ThemeContext';
import AuthProvider from '@/contexts/AuthContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { runMigrations } from '@/lib/db/migrations';
import { lightColors, spacing, radii, typePresets } from '@/theme/tokens';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';

const FONT_TIMEOUT_MS = 5000;

SplashScreen.preventAutoHideAsync();

function ThemeWrapper({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();
  return <ThemeProvider darkMode={settings.darkMode}>{children}</ThemeProvider>;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Outfit: Outfit_400Regular,
    'Outfit-Medium': Outfit_500Medium,
    'Outfit-SemiBold': Outfit_600SemiBold,
    'Outfit-Bold': Outfit_700Bold,
    WorkSans: WorkSans_400Regular,
    'WorkSans-Medium': WorkSans_500Medium,
    'WorkSans-SemiBold': WorkSans_600SemiBold,
    'WorkSans-Bold': WorkSans_700Bold,
  });

  const [fontTimedOut, setFontTimedOut] = useState(false);
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [dbRetryCount, setDbRetryCount] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setFontTimedOut(true), FONT_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

  const fontsReady = fontsLoaded || fontError || fontTimedOut;

  useEffect(() => {
    if (fontsReady && dbReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsReady, dbReady]);

  const handleDbInit = useCallback(async (db: import('expo-sqlite').SQLiteDatabase) => {
    try {
      runMigrations(db);
      setDbReady(true);
    } catch (e) {
      console.error('SQLite migration failed:', e);
      setDbError(e instanceof Error ? e.message : 'Database migration failed');
    }
  }, []);

  if (!fontsReady) {
    return null;
  }

  if (dbError) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: spacing[6],
            backgroundColor: lightColors.background,
          }}
        >
          <Text
            style={{
              ...typePresets.title,
              color: lightColors.text,
              marginBottom: spacing[2],
            }}
          >
            Database Error
          </Text>
          <Text
            style={{
              ...typePresets.bodySmall,
              color: lightColors.textSecondary,
              textAlign: 'center',
              marginBottom: spacing[6],
            }}
          >
            {dbError}
          </Text>
          <AnimatedPressable
            onPress={() => {
              setDbError(null);
              setDbReady(false);
              setDbRetryCount((c) => c + 1);
            }}
            hapticPattern="light"
            accessibilityRole="button"
            accessibilityLabel="Retry"
            style={{
              backgroundColor: lightColors.primary,
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
                color: lightColors.textInverse,
                fontWeight: '600',
              }}
            >
              Retry
            </Text>
          </AnimatedPressable>
        </View>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <SQLiteProvider
          key={dbRetryCount}
          databaseName="commissary.db"
          onInit={handleDbInit}
        >
          <SettingsProvider>
            <ThemeWrapper>
              <AuthProvider>
                <Slot />
              </AuthProvider>
            </ThemeWrapper>
          </SettingsProvider>
        </SQLiteProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
