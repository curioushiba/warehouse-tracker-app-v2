import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as ExpoHaptics from 'expo-haptics'
import { haptic, hapticSelection } from './haptics'

describe('haptics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('haptic()', () => {
    it('calls impactAsync with Light for "light" pattern', () => {
      haptic('light')
      expect(ExpoHaptics.impactAsync).toHaveBeenCalledWith(
        ExpoHaptics.ImpactFeedbackStyle.Light
      )
    })

    it('calls impactAsync with Medium for "medium" pattern', () => {
      haptic('medium')
      expect(ExpoHaptics.impactAsync).toHaveBeenCalledWith(
        ExpoHaptics.ImpactFeedbackStyle.Medium
      )
    })

    it('calls impactAsync with Heavy for "heavy" pattern', () => {
      haptic('heavy')
      expect(ExpoHaptics.impactAsync).toHaveBeenCalledWith(
        ExpoHaptics.ImpactFeedbackStyle.Heavy
      )
    })

    it('calls notificationAsync with Success for "success" pattern', () => {
      haptic('success')
      expect(ExpoHaptics.notificationAsync).toHaveBeenCalledWith(
        ExpoHaptics.NotificationFeedbackType.Success
      )
    })

    it('calls notificationAsync with Warning for "warning" pattern', () => {
      haptic('warning')
      expect(ExpoHaptics.notificationAsync).toHaveBeenCalledWith(
        ExpoHaptics.NotificationFeedbackType.Warning
      )
    })

    it('calls notificationAsync with Error for "error" pattern', () => {
      haptic('error')
      expect(ExpoHaptics.notificationAsync).toHaveBeenCalledWith(
        ExpoHaptics.NotificationFeedbackType.Error
      )
    })

    it('does not throw when haptics fails', () => {
      vi.mocked(ExpoHaptics.impactAsync).mockRejectedValueOnce(
        new Error('Haptics unavailable')
      )
      expect(() => haptic('light')).not.toThrow()
    })
  })

  describe('hapticSelection()', () => {
    it('calls selectionAsync', () => {
      hapticSelection()
      expect(ExpoHaptics.selectionAsync).toHaveBeenCalled()
    })

    it('does not throw when haptics fails', () => {
      vi.mocked(ExpoHaptics.selectionAsync).mockRejectedValueOnce(
        new Error('Haptics unavailable')
      )
      expect(() => hapticSelection()).not.toThrow()
    })
  })
})
