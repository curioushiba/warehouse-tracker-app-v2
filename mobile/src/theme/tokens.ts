// Design tokens for PackTrack mobile app
// Single source of truth for colors, spacing, typography, shadows, and radii

// --- Raw Color Palette ---

export const palette = {
  // Brand
  green50: '#DCFCE7',
  green100: '#BBF7D0',
  green500: '#16A34A',
  green600: '#15803D',
  green700: '#01722f',
  green800: '#166534',
  green900: '#052e16',
  greenDark: '#4db576', // lighter green for dark backgrounds

  // Neutrals (Tailwind gray scale)
  white: '#FFFFFF',
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
  black: '#000000',

  // Status
  red50: '#FEE2E2',
  red300: '#FCA5A5',
  red500: '#EF4444',
  red600: '#dc2626',
  red700: '#B91C1C',
  red900: '#450a0a',

  yellow50: '#FEF9C3',
  yellow200: '#FDE68A',
  yellow500: '#EAB308',
  yellow700: '#A16207',
  yellow900: '#422006',

  blue50: '#DBEAFE',
  blue300: '#93C5FD',
  blue500: '#3B82F6',
  blue600: '#2563EB',
  blue700: '#1D4ED8',
  blue900: '#172554',

  indigo50: '#E0E7FF',
  indigo300: '#A5B4FC',
  indigo500: '#6366F1',
  indigo900: '#312e81',

  // Domain brand colors
  commissaryOrange: '#E07A2F',
  frozenBlue: '#2563EB',

  // CTA
  ctaYellow: '#ffcc00',
  ctaText: '#1a1a1a',

  // Overlays
  overlay: 'rgba(0,0,0,0.5)',
  overlayDark: 'rgba(0,0,0,0.7)',
  overlayHeavy: 'rgba(0,0,0,0.8)',
  overlayLight: 'rgba(255,255,255,0.3)',
} as const

// --- Semantic Color Tokens ---

export interface SemanticColors {
  // Backgrounds
  bgPrimary: string
  bgSecondary: string
  bgTertiary: string
  bgInverse: string

  // Surfaces (cards, modals)
  surfacePrimary: string
  surfaceSecondary: string
  surfaceElevated: string
  surfaceTertiary: string
  surfacePressed: string

  // Text
  textPrimary: string
  textSecondary: string
  textTertiary: string
  textInverse: string
  textDisabled: string
  textPlaceholder: string

  // Brand
  brandPrimary: string
  brandSecondary: string
  brandText: string

  // Status
  success: string
  successBg: string
  successText: string
  error: string
  errorBg: string
  errorText: string
  warning: string
  warningBg: string
  warningText: string
  info: string
  infoBg: string
  infoText: string

  // Transaction types
  checkIn: string
  checkOut: string
  adjustment: string

  // Interactive
  ctaBg: string
  ctaText: string
  dangerBg: string
  dangerText: string

  // Borders
  borderPrimary: string
  borderSubtle: string
  borderFocus: string
  borderAccent: string

  // Badge schemes (solid)
  badgePrimaryBg: string
  badgePrimaryText: string
  badgeSecondaryBg: string
  badgeSecondaryText: string
  badgeSuccessBg: string
  badgeSuccessText: string
  badgeWarningBg: string
  badgeWarningText: string
  badgeErrorBg: string
  badgeErrorText: string
  badgeInfoBg: string
  badgeInfoText: string
  badgeNeutralBg: string
  badgeNeutralText: string

  // Badge schemes (subtle)
  badgePrimarySubtleBg: string
  badgePrimarySubtleText: string
  badgeSecondarySubtleBg: string
  badgeSecondarySubtleText: string
  badgeSuccessSubtleBg: string
  badgeSuccessSubtleText: string
  badgeWarningSubtleBg: string
  badgeWarningSubtleText: string
  badgeErrorSubtleBg: string
  badgeErrorSubtleText: string
  badgeInfoSubtleBg: string
  badgeInfoSubtleText: string
  badgeNeutralSubtleBg: string
  badgeNeutralSubtleText: string

  // Overlay
  overlay: string
  overlayHeavy: string
  overlaySubtle: string

  // Switch
  switchTrackActive: string
  switchTrackInactive: string
  switchThumb: string

  // Icon
  iconPrimary: string
  iconSecondary: string
  iconInverse: string
  iconBrand: string
}

export const lightColors: SemanticColors = {
  // Backgrounds
  bgPrimary: palette.gray50,
  bgSecondary: palette.white,
  bgTertiary: palette.gray100,
  bgInverse: palette.gray800,

  // Surfaces
  surfacePrimary: palette.white,
  surfaceSecondary: palette.gray50,
  surfaceElevated: palette.white,
  surfaceTertiary: palette.gray100,
  surfacePressed: palette.gray200,

  // Text
  textPrimary: palette.gray800,
  textSecondary: palette.gray500,
  textTertiary: palette.gray400,
  textInverse: palette.white,
  textDisabled: palette.gray300,
  textPlaceholder: palette.gray400,

  // Brand
  brandPrimary: palette.green700,
  brandSecondary: palette.green50,
  brandText: palette.white,

  // Status
  success: palette.green500,
  successBg: palette.green50,
  successText: palette.green500,
  error: palette.red500,
  errorBg: palette.red50,
  errorText: palette.red500,
  warning: palette.yellow500,
  warningBg: palette.yellow50,
  warningText: palette.yellow700,
  info: palette.blue500,
  infoBg: palette.blue50,
  infoText: palette.blue500,

  // Transaction types
  checkIn: palette.green500,
  checkOut: palette.red600,
  adjustment: palette.blue500,

  // Interactive
  ctaBg: palette.ctaYellow,
  ctaText: palette.ctaText,
  dangerBg: palette.red500,
  dangerText: palette.white,

  // Borders
  borderPrimary: palette.gray300,
  borderSubtle: palette.gray200,
  borderFocus: palette.green700,
  borderAccent: palette.green700,

  // Badge solid
  badgePrimaryBg: palette.green700,
  badgePrimaryText: palette.white,
  badgeSecondaryBg: palette.indigo500,
  badgeSecondaryText: palette.white,
  badgeSuccessBg: palette.green500,
  badgeSuccessText: palette.white,
  badgeWarningBg: palette.yellow500,
  badgeWarningText: palette.gray800,
  badgeErrorBg: palette.red500,
  badgeErrorText: palette.white,
  badgeInfoBg: palette.blue500,
  badgeInfoText: palette.white,
  badgeNeutralBg: palette.gray500,
  badgeNeutralText: palette.white,

  // Badge subtle
  badgePrimarySubtleBg: palette.green50,
  badgePrimarySubtleText: palette.green700,
  badgeSecondarySubtleBg: palette.indigo50,
  badgeSecondarySubtleText: palette.indigo500,
  badgeSuccessSubtleBg: palette.green50,
  badgeSuccessSubtleText: palette.green500,
  badgeWarningSubtleBg: palette.yellow50,
  badgeWarningSubtleText: palette.yellow700,
  badgeErrorSubtleBg: palette.red50,
  badgeErrorSubtleText: palette.red500,
  badgeInfoSubtleBg: palette.blue50,
  badgeInfoSubtleText: palette.blue500,
  badgeNeutralSubtleBg: palette.gray100,
  badgeNeutralSubtleText: palette.gray500,

  // Overlay
  overlay: palette.overlay,
  overlayHeavy: palette.overlayHeavy,
  overlaySubtle: 'rgba(0,0,0,0.1)',

  // Switch
  switchTrackActive: palette.green500,
  switchTrackInactive: palette.gray300,
  switchThumb: palette.white,

  // Icon
  iconPrimary: palette.gray700,
  iconSecondary: palette.gray400,
  iconInverse: palette.white,
  iconBrand: palette.green700,
}

export const darkColors: SemanticColors = {
  // Backgrounds
  bgPrimary: palette.gray950,
  bgSecondary: palette.gray900,
  bgTertiary: palette.gray800,
  bgInverse: palette.gray100,

  // Surfaces
  surfacePrimary: palette.gray900,
  surfaceSecondary: palette.gray800,
  surfaceElevated: palette.gray800,
  surfaceTertiary: palette.gray700,
  surfacePressed: palette.gray700,

  // Text
  textPrimary: palette.gray50,
  textSecondary: palette.gray400,
  textTertiary: palette.gray500,
  textInverse: palette.gray900,
  textDisabled: palette.gray600,
  textPlaceholder: palette.gray500,

  // Brand
  brandPrimary: palette.greenDark,
  brandSecondary: palette.green800,
  brandText: palette.white,

  // Status (vivid in dark mode)
  success: palette.green500,
  successBg: palette.green900,
  successText: palette.green100,
  error: palette.red500,
  errorBg: palette.red900,
  errorText: palette.red300,
  warning: palette.yellow500,
  warningBg: palette.yellow900,
  warningText: palette.yellow200,
  info: palette.blue500,
  infoBg: palette.blue900,
  infoText: palette.blue300,

  // Transaction types
  checkIn: palette.green500,
  checkOut: palette.red500,
  adjustment: palette.blue500,

  // Interactive
  ctaBg: palette.ctaYellow,
  ctaText: palette.ctaText,
  dangerBg: palette.red500,
  dangerText: palette.white,

  // Borders
  borderPrimary: palette.gray600,
  borderSubtle: palette.gray700,
  borderFocus: palette.greenDark,
  borderAccent: palette.greenDark,

  // Badge solid
  badgePrimaryBg: palette.greenDark,
  badgePrimaryText: palette.white,
  badgeSecondaryBg: palette.indigo500,
  badgeSecondaryText: palette.white,
  badgeSuccessBg: palette.green500,
  badgeSuccessText: palette.white,
  badgeWarningBg: palette.yellow500,
  badgeWarningText: palette.gray800,
  badgeErrorBg: palette.red500,
  badgeErrorText: palette.white,
  badgeInfoBg: palette.blue500,
  badgeInfoText: palette.white,
  badgeNeutralBg: palette.gray500,
  badgeNeutralText: palette.white,

  // Badge subtle
  badgePrimarySubtleBg: palette.green800,
  badgePrimarySubtleText: palette.green100,
  badgeSecondarySubtleBg: palette.indigo900,
  badgeSecondarySubtleText: palette.indigo300,
  badgeSuccessSubtleBg: palette.green900,
  badgeSuccessSubtleText: palette.green100,
  badgeWarningSubtleBg: palette.yellow900,
  badgeWarningSubtleText: palette.yellow200,
  badgeErrorSubtleBg: palette.red900,
  badgeErrorSubtleText: palette.red300,
  badgeInfoSubtleBg: palette.blue900,
  badgeInfoSubtleText: palette.blue300,
  badgeNeutralSubtleBg: palette.gray800,
  badgeNeutralSubtleText: palette.gray400,

  // Overlay
  overlay: palette.overlayDark,
  overlayHeavy: palette.overlayHeavy,
  overlaySubtle: palette.overlayLight,

  // Switch
  switchTrackActive: palette.greenDark,
  switchTrackInactive: palette.gray600,
  switchThumb: palette.white,

  // Icon
  iconPrimary: palette.gray200,
  iconSecondary: palette.gray500,
  iconInverse: palette.gray900,
  iconBrand: palette.greenDark,
}

// --- Spacing Scale (4px base) ---

export const spacing = {
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const

// --- Typography Scale ---

export const fontFamily = {
  heading: 'Outfit',
  body: 'WorkSans',
} as const

export const typography = {
  xs: { fontSize: 11, lineHeight: 16 },
  sm: { fontSize: 12, lineHeight: 16 },
  base: { fontSize: 14, lineHeight: 20 },
  md: { fontSize: 15, lineHeight: 22 },
  lg: { fontSize: 16, lineHeight: 24 },
  xl: { fontSize: 18, lineHeight: 28 },
  '2xl': { fontSize: 20, lineHeight: 28 },
  '3xl': { fontSize: 24, lineHeight: 32 },
  '4xl': { fontSize: 30, lineHeight: 36 },

  weight: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
} as const

// Typography presets combining size + font family
export const typePresets = {
  h1: { ...typography['3xl'], fontFamily: fontFamily.heading, fontWeight: typography.weight.bold },
  h2: { ...typography['2xl'], fontFamily: fontFamily.heading, fontWeight: typography.weight.bold },
  h3: { ...typography.xl, fontFamily: fontFamily.heading, fontWeight: typography.weight.bold },
  body: { ...typography.base, fontFamily: fontFamily.body, fontWeight: typography.weight.normal },
  label: { ...typography.sm, fontFamily: fontFamily.body, fontWeight: typography.weight.medium },
  caption: { ...typography.xs, fontFamily: fontFamily.body, fontWeight: typography.weight.normal },
} as const

// --- Shadow Tokens ---

export interface ShadowToken {
  shadowColor: string
  shadowOffset: { width: number; height: number }
  shadowOpacity: number
  shadowRadius: number
  elevation: number
}

export type ShadowScale = Record<'none' | 'sm' | 'md' | 'lg' | 'xl', ShadowToken>

export function getShadows(isDark: boolean): ShadowScale {
  if (isDark) {
    return {
      none: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0,
        shadowRadius: 0,
        elevation: 0,
      },
      sm: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 2,
      },
      md: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.4,
        shadowRadius: 6,
        elevation: 4,
      },
      lg: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 8,
      },
      xl: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.6,
        shadowRadius: 14,
        elevation: 12,
      },
    }
  }

  return {
    none: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    sm: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 1,
    },
    md: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 3,
    },
    lg: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.15,
      shadowRadius: 10,
      elevation: 6,
    },
    xl: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 14,
      elevation: 10,
    },
  }
}

// Static shadows export for backward compatibility
export const shadows = getShadows(false)

// --- Border Radius Tokens ---

export const radii = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
  button: 22.5,
} as const

// --- Z-Index Scale ---

export const zIndex = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  overlay: 30,
  modal: 40,
  toast: 50,
} as const

// --- Touch Target Constants ---

export const touchTarget = {
  minimum: 44,
  preferred: 48,
} as const
