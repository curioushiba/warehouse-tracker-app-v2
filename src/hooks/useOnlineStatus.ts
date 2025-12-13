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
      setIsOnline(true)
      // Track that we came back online (useful for triggering sync)
      if (!isOnline) {
        setWasOffline(true)
      }
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
  }, [isOnline])

  const clearWasOffline = useCallback(() => {
    setWasOffline(false)
  }, [])

  return {
    isOnline,
    wasOffline,
    clearWasOffline,
  }
}
