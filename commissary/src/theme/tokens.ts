// ---------------------------------------------------------------------------
// Design tokens for PackTrack Commissary
// ---------------------------------------------------------------------------

// -- Font families (loaded via expo-font / useFonts in root layout) ---------

export const fontFamily = {
  heading: 'Outfit',
  headingMedium: 'Outfit-Medium',
  headingSemiBold: 'Outfit-SemiBold',
  headingBold: 'Outfit-Bold',
  body: 'WorkSans',
  bodyMedium: 'WorkSans-Medium',
  bodySemiBold: 'WorkSans-SemiBold',
  bodyBold: 'WorkSans-Bold',
  mono: 'monospace',
} as const;

// -- Color palette ----------------------------------------------------------

export const palette = {
  // Brand
  blue50: '#EFF6FF',
  blue100: '#DBEAFE',
  blue200: '#BFDBFE',
  blue300: '#93C5FD',
  blue400: '#60A5FA',
  blue500: '#3B82F6',
  blue600: '#2563EB',
  blue700: '#1D4ED8',
  blue800: '#1E40AF',
  blue900: '#1E3A8A',

  // Amber
  amber50: '#FFFBEB',
  amber100: '#FEF3C7',
  amber200: '#FDE68A',
  amber300: '#FCD34D',
  amber400: '#FBBF24',
  amber500: '#F59E0B',
  amber600: '#D97706',
  amber700: '#B45309',
  amber800: '#92400E',
  amber900: '#78350F',

  // Neutral
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',
  gray950: '#030712',

  // Semantic
  green50: '#F0FDF4',
  green500: '#22C55E',
  green600: '#16A34A',
  green700: '#15803D',

  yellow50: '#FFFBEB',
  yellow500: '#F59E0B',
  yellow600: '#D97706',
  yellow700: '#B45309',

  red50: '#FEF2F2',
  red500: '#EF4444',
  red600: '#DC2626',
  red700: '#B91C1C',

  // Base
  white: '#FFFFFF',
  black: '#000000',
} as const;

// -- Screen header colors (Amber/Warm commissary palette) -------------------

export const screenColors = {
  dashboard:        '#B45309',   // Amber dark
  produce:          '#D97706',   // Amber primary
  profile:          '#78350F',   // Amber deepest
  productionDetail: '#F59E0B',   // Amber accent
} as const;

// -- Semantic colors --------------------------------------------------------

export interface SemanticColors {
  // Brand
  primary: string;
  primaryLight: string;
  secondary: string;
  accent: string;

  // Surfaces
  background: string;
  surface: string;
  surfaceSecondary: string;
  surfaceTertiary: string;
  surfacePressed: string;

  // Text
  text: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;

  // Borders
  border: string;
  borderAccent: string;
  borderSubtle: string;

  // Status
  success: string;
  successBackground: string;
  warning: string;
  warningBackground: string;
  error: string;
  errorBackground: string;
  info: string;
  infoBackground: string;

  // Overlays
  overlay: string;
  overlayHeavy: string;
  overlaySubtle: string;

  // Icons
  iconPrimary: string;
  iconSecondary: string;
  iconBrand: string;
}

export const lightColors: SemanticColors = {
  primary: palette.amber600,
  primaryLight: palette.amber50,
  secondary: palette.gray600,
  accent: palette.amber500,

  background: palette.gray50,
  surface: palette.white,
  surfaceSecondary: palette.gray100,
  surfaceTertiary: palette.gray200,
  surfacePressed: palette.gray200,

  text: palette.gray900,
  textSecondary: palette.gray600,
  textTertiary: palette.gray400,
  textInverse: palette.white,

  border: palette.gray200,
  borderAccent: palette.amber600,
  borderSubtle: palette.gray100,

  success: palette.green500,
  successBackground: palette.green50,
  warning: palette.yellow500,
  warningBackground: palette.yellow50,
  error: palette.red500,
  errorBackground: palette.red50,
  info: palette.blue500,
  infoBackground: palette.blue50,

  overlay: 'rgba(0, 0, 0, 0.4)',
  overlayHeavy: 'rgba(0, 0, 0, 0.6)',
  overlaySubtle: 'rgba(0, 0, 0, 0.2)',

  iconPrimary: palette.gray700,
  iconSecondary: palette.gray400,
  iconBrand: palette.amber600,
};

export const darkColors: SemanticColors = {
  primary: palette.amber500,
  primaryLight: palette.amber900,
  secondary: palette.gray400,
  accent: palette.amber400,

  background: palette.gray950,
  surface: palette.gray900,
  surfaceSecondary: palette.gray800,
  surfaceTertiary: palette.gray700,
  surfacePressed: palette.gray700,

  text: palette.gray50,
  textSecondary: palette.gray400,
  textTertiary: palette.gray500,
  textInverse: palette.gray900,

  border: palette.gray700,
  borderAccent: palette.amber500,
  borderSubtle: palette.gray800,

  success: palette.green500,
  successBackground: 'rgba(34, 197, 94, 0.15)',
  warning: palette.yellow500,
  warningBackground: 'rgba(245, 158, 11, 0.15)',
  error: palette.red500,
  errorBackground: 'rgba(239, 68, 68, 0.15)',
  info: palette.blue400,
  infoBackground: 'rgba(59, 130, 246, 0.15)',

  overlay: 'rgba(0, 0, 0, 0.6)',
  overlayHeavy: 'rgba(0, 0, 0, 0.8)',
  overlaySubtle: 'rgba(0, 0, 0, 0.4)',

  iconPrimary: palette.gray200,
  iconSecondary: palette.gray500,
  iconBrand: palette.amber400,
};

// -- Spacing ----------------------------------------------------------------

export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

// -- Border radii -----------------------------------------------------------

export const radii = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

// -- Typography presets -----------------------------------------------------

export interface TypePreset {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  fontWeight: 'normal' | '500' | '600' | '700';
}

export const typePresets = {
  display: {
    fontFamily: fontFamily.headingBold,
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700' as const,
  },
  heading: {
    fontFamily: fontFamily.headingSemiBold,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '600' as const,
  },
  title: {
    fontFamily: fontFamily.headingSemiBold,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600' as const,
  },
  body: {
    fontFamily: fontFamily.body,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: 'normal' as const,
  },
  bodySmall: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 'normal' as const,
  },
  caption: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: 'normal' as const,
  },
  label: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600' as const,
  },
} as const satisfies Record<string, TypePreset>;

// -- Shadows ----------------------------------------------------------------

export interface ShadowValue {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
}

export type ShadowScale = Record<'none' | 'sm' | 'md' | 'lg' | 'xl', ShadowValue>;

export function getShadows(isDark: boolean): ShadowScale {
  const color = isDark ? palette.black : palette.gray900;
  const base = isDark ? 0.4 : 0.1;

  return {
    none: {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    sm: {
      shadowColor: color,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: base,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: color,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: base * 1.2,
      shadowRadius: 4,
      elevation: 3,
    },
    lg: {
      shadowColor: color,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: base * 1.5,
      shadowRadius: 8,
      elevation: 6,
    },
    xl: {
      shadowColor: color,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: base * 2,
      shadowRadius: 16,
      elevation: 10,
    },
  };
}

// -- Z-index ----------------------------------------------------------------

export const zIndex = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  modal: 30,
  toast: 40,
} as const;

// -- Touch targets ----------------------------------------------------------

export const touchTarget = {
  minHeight: 44,
  minWidth: 44,
} as const;
