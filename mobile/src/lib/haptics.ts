import * as Haptics from 'expo-haptics'

export type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error'

export function haptic(pattern: HapticPattern): void {
  switch (pattern) {
    case 'light':
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
      break
    case 'medium':
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {})
      break
    case 'heavy':
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {})
      break
    case 'success':
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
      break
    case 'warning':
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {})
      break
    case 'error':
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {})
      break
  }
}

export function hapticSelection(): void {
  Haptics.selectionAsync().catch(() => {})
}
