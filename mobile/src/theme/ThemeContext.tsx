import React, { createContext, useContext, useMemo } from 'react'
import { Appearance } from 'react-native'
import { useSettings } from '@/contexts/SettingsContext'
import {
  lightColors,
  darkColors,
  spacing,
  typography,
  typePresets,
  fontFamily,
  getShadows,
  radii,
  zIndex,
  touchTarget,
  type SemanticColors,
  type ShadowScale,
} from './tokens'

export interface ThemeValue {
  colors: SemanticColors
  spacing: typeof spacing
  typography: typeof typography
  typePresets: typeof typePresets
  fontFamily: typeof fontFamily
  shadows: ShadowScale
  radii: typeof radii
  zIndex: typeof zIndex
  touchTarget: typeof touchTarget
  isDark: boolean
}

const ThemeContext = createContext<ThemeValue | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings()

  const theme = useMemo<ThemeValue>(() => {
    let isDark: boolean
    if (settings.darkMode === 'system') {
      isDark = Appearance.getColorScheme() === 'dark'
    } else {
      isDark = settings.darkMode === 'dark'
    }

    return {
      colors: isDark ? darkColors : lightColors,
      spacing,
      typography,
      typePresets,
      fontFamily,
      shadows: getShadows(isDark),
      radii,
      zIndex,
      touchTarget,
      isDark,
    }
  }, [settings.darkMode])

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeValue {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
