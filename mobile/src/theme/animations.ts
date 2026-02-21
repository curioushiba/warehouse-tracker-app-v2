// ---------------------------------------------------------------------------
// Animation constants for react-native-reanimated
// ---------------------------------------------------------------------------

import { Easing } from 'react-native-reanimated';

/** Scale factor for general press feedback */
export const PRESS_SCALE = 0.97;

/** Scale factor for card press feedback (subtler) */
export const CARD_PRESS = 0.98;

/** Duration (ms) for shimmer / skeleton loading animations */
export const SHIMMER_DURATION = 1200;

/** Duration (ms) for fade-in / fade-out transitions */
export const FADE_DURATION = 200;

/** Spring config for modal open/close */
export const MODAL_SPRING = { damping: 20, stiffness: 300, mass: 0.8 } as const;

/** Timing config for standard eased transitions */
export const TIMING_CONFIG = {
  duration: 200,
  easing: Easing.bezier(0.25, 0.1, 0.25, 1),
} as const;

/** Delay (ms) between staggered list items */
export const STAGGER_DELAY = 50;

/** Maximum total stagger delay (ms) to cap long lists */
export const STAGGER_MAX_DELAY = 300;

/** Spring config for layout transitions */
export const LAYOUT_SPRING = { damping: 15, stiffness: 150 } as const;

/** Spring config for tab indicator sliding */
export const TAB_SPRING = { damping: 20, stiffness: 200 } as const;

/** Duration (ms) for micro interactions (checkboxes, toggles) */
export const MICRO_DURATION = 100;
