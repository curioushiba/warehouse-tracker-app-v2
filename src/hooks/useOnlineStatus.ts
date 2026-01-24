'use client'

import { useEffect, useState, useCallback } from 'react'

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true)
  const [wasOffline, setWasOffline] = useState(false)

  useEffect(() => {
    // Set initial state based on navigator
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine)
    }

    const handleOnline = () => {
      // Use functional update to access current state and avoid stale closure
      setIsOnline(prev => {
        if (!prev) {
          // We were offline, mark wasOffline for sync trigger
          setWasOffline(true)
        }
        return true
      })
    }

    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, []) // No longer depends on isOnline

  const clearWasOffline = useCallback(() => {
    setWasOffline(false)
  }, [])

  return {
    isOnline,
    wasOffline,
    clearWasOffline,
  }
}
