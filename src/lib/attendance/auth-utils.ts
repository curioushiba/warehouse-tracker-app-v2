/**
 * Attendance Auth Utilities
 * Helper functions for attendance authentication flow
 */

/**
 * Build login URL with redirect params
 */
export function buildLoginUrl(storeCode?: string, currentPath?: string): string {
  const params = new URLSearchParams()

  if (currentPath) {
    params.set('redirect', currentPath)
  }

  if (storeCode) {
    params.set('store', storeCode)
  }

  const queryString = params.toString()
  return `/attendance/login${queryString ? `?${queryString}` : ''}`
}

/**
 * Build clock-in URL with store code
 */
export function buildClockInUrl(storeCode: string): string {
  return `/attendance/checkin?store=${encodeURIComponent(storeCode)}`
}

/**
 * Extract store code from QR code value
 * QR codes encode the full URL, need to extract store param
 */
export function extractStoreCode(qrValue: string): string | null {
  // If it's just the code itself (ATT-XXXXX)
  if (qrValue.startsWith('ATT-')) {
    return qrValue
  }

  // If it's a full URL, extract store param
  try {
    const url = new URL(qrValue)
    return url.searchParams.get('store')
  } catch {
    // Not a valid URL, maybe just the code
    if (qrValue.includes('ATT-')) {
      const match = qrValue.match(/ATT-\d{5}/)
      return match ? match[0] : null
    }
    return null
  }
}

/**
 * Get device info for attendance record
 */
export function getDeviceInfo(): Record<string, unknown> {
  if (typeof window === 'undefined') {
    return {}
  }

  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    timestamp: new Date().toISOString(),
  }
}
