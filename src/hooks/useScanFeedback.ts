'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

export interface ScanFeedbackItem {
  itemName: string
  itemImageUrl?: string | null
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext
  }
}

/**
 * Play a short beep sound using Web Audio API
 * Frequency: 1kHz, Duration: 100ms, Volume: 30%
 */
function playBeep() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) return

    const audioContext = new AudioContextClass()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.frequency.value = 1000 // 1kHz tone
    oscillator.type = 'sine'
    gainNode.gain.value = 0.3 // 30% volume

    // Close AudioContext after oscillator finishes to prevent memory leak
    oscillator.onended = () => {
      audioContext.close().catch(() => {
        // Ignore close errors
      })
    }

    oscillator.start()
    oscillator.stop(audioContext.currentTime + 0.1) // 100ms duration
  } catch {
    // Silently fail if audio not supported
  }
}

/**
 * Trigger haptic vibration (mobile devices only)
 * Duration: 50ms pulse
 */
function vibrate() {
  if ('vibrate' in navigator) {
    navigator.vibrate(50)
  }
}

export interface UseScanFeedbackReturn {
  /** Trigger all feedback (visual, audio, haptic) */
  triggerFeedback: (item: ScanFeedbackItem) => void
  /** Current item being displayed in overlay (null if hidden) */
  feedbackItem: ScanFeedbackItem | null
  /** Whether the overlay is currently visible */
  isVisible: boolean
  /** Whether the overlay is in exit animation phase */
  isExiting: boolean
}

// Animation timing: fade-out is 200ms, so start exit animation 200ms before hide
const OVERLAY_DURATION = 1000 // Total display time in ms
const EXIT_ANIMATION_DURATION = 200 // CSS fade-out animation duration
const EXIT_ANIMATION_START = OVERLAY_DURATION - EXIT_ANIMATION_DURATION // 800ms

export function useScanFeedback(): UseScanFeedbackReturn {
  const [feedbackItem, setFeedbackItem] = useState<ScanFeedbackItem | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const exitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current)
      if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current)
    }
  }, [])

  const triggerFeedback = useCallback((item: ScanFeedbackItem) => {
    // Clear any existing timeouts
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current)
    if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current)

    // Reset state for new feedback
    setIsExiting(false)
    setFeedbackItem(item)
    setIsVisible(true)

    // Trigger audio and haptic feedback
    playBeep()
    vibrate()

    // Start exit animation before hiding
    exitTimeoutRef.current = setTimeout(() => {
      setIsExiting(true)
    }, EXIT_ANIMATION_START)

    // Hide overlay after full duration (after exit animation completes)
    hideTimeoutRef.current = setTimeout(() => {
      setIsVisible(false)
      setFeedbackItem(null)
      setIsExiting(false)
    }, OVERLAY_DURATION)
  }, [])

  return {
    triggerFeedback,
    feedbackItem,
    isVisible,
    isExiting,
  }
}
