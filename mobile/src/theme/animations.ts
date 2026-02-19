// Centralized animation configs for react-native-reanimated

import { Easing } from 'react-native-reanimated'

/** Scale-down on press for buttons */
export const PRESS_SCALE = {
  toValue: 0.97,
  duration: 100,
} as const

/** Scale-down on press for cards */
export const CARD_PRESS = {
  toValue: 0.98,
  duration: 80,
} as const

/** Shimmer/skeleton pulse animation duration (ms) */
export const SHIMMER_DURATION = 1000

/** Standard fade animation duration (ms) */
export const FADE_DURATION = 200

/** Modal spring config */
export const MODAL_SPRING = {
  damping: 20,
  stiffness: 200,
} as const

/** Slide-in animation duration (ms) */
export const SLIDE_DURATION = 250

/** Standard timing config for animated transitions */
export const TIMING_CONFIG = {
  duration: 200,
  easing: Easing.bezier(0.25, 0.1, 0.25, 1),
} as const

/** Stagger delay per list item (ms) */
export const STAGGER_DELAY = 50

/** Maximum stagger delay cap for deep lists (ms) */
export const STAGGER_MAX_DELAY = 300

/** SegmentedControl indicator slide duration (ms) */
export const SEGMENT_SLIDE = 200

/** Tab bar spring animation config */
export const TAB_SPRING = {
  damping: 15,
  stiffness: 150,
} as const

/** Layout animation spring config */
export const LAYOUT_SPRING = {
  damping: 20,
  stiffness: 200,
} as const

/** Quick micro-interaction duration (ms) */
export const MICRO_DURATION = 100
