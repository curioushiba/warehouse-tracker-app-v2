// ---------------------------------------------------------------------------
// Theme provider & hook
// ---------------------------------------------------------------------------

import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';

import {
  type SemanticColors,
  type ShadowScale,
  lightColors,
  darkColors,
  spacing,
  radii,
  typePresets,
  fontFamily,
  getShadows,
  zIndex,
  touchTarget,
} from './tokens';

// -- Types ------------------------------------------------------------------

export type DarkModePreference = 'light' | 'dark' | 'system';

export interface ThemeValue {
  colors: SemanticColors;
  spacing: typeof spacing;
  typography: typeof typePresets;
  typePresets: typeof typePresets;
  fontFamily: typeof fontFamily;
  shadows: ShadowScale;
  radii: typeof radii;
  zIndex: typeof zIndex;
  touchTarget: typeof touchTarget;
  isDark: boolean;
}

// -- Context ----------------------------------------------------------------

const ThemeContext = createContext<ThemeValue | null>(null);

// -- Provider ---------------------------------------------------------------

interface ThemeProviderProps {
  darkMode: DarkModePreference;
  children: React.ReactNode;
}

export function ThemeProvider({ darkMode, children }: ThemeProviderProps) {
  const systemScheme = useColorScheme();

  const isDark =
    darkMode === 'dark' ||
    (darkMode === 'system' && systemScheme === 'dark');

  const value = useMemo<ThemeValue>(() => {
    const colors = isDark ? darkColors : lightColors;
    return {
      colors,
      spacing,
      typography: typePresets,
      typePresets,
      fontFamily,
      shadows: getShadows(isDark),
      radii,
      zIndex,
      touchTarget,
      isDark,
    };
  }, [isDark]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

// -- Hook -------------------------------------------------------------------

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
