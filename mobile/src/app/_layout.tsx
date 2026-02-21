import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Slot } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SQLiteProvider } from 'expo-sqlite';
import { SettingsProvider, useSettings } from '@/contexts/SettingsContext';
import { ThemeProvider } from '@/theme/ThemeContext';
import AuthProvider from '@/contexts/AuthContext';
import { runMigrations } from '@/lib/db/migrations';

function ThemeWrapper({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();
  return <ThemeProvider darkMode={settings.darkMode}>{children}</ThemeProvider>;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SQLiteProvider databaseName="packtrack.db" onInit={async (db) => { runMigrations(db); }}>
        <SettingsProvider>
          <ThemeWrapper>
            <AuthProvider>
              <Slot />
            </AuthProvider>
          </ThemeWrapper>
        </SettingsProvider>
      </SQLiteProvider>
    </GestureHandlerRootView>
  );
}
