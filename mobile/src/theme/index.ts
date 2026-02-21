// ---------------------------------------------------------------------------
// Barrel export for the theme system
// ---------------------------------------------------------------------------

// Tokens
export {
  palette,
  fontFamily,
  lightColors,
  darkColors,
  spacing,
  radii,
  typePresets,
  getShadows,
  zIndex,
  touchTarget,
} from './tokens';

export type {
  SemanticColors,
  TypePreset,
  ShadowValue,
  ShadowScale,
} from './tokens';

// Theme context
export { ThemeProvider, useTheme } from './ThemeContext';
export type { DarkModePreference, ThemeValue } from './ThemeContext';

// Animations
export {
  PRESS_SCALE,
  CARD_PRESS,
  SHIMMER_DURATION,
  FADE_DURATION,
  MODAL_SPRING,
  TIMING_CONFIG,
  STAGGER_DELAY,
  STAGGER_MAX_DELAY,
  LAYOUT_SPRING,
  TAB_SPRING,
  MICRO_DURATION,
} from './animations';
