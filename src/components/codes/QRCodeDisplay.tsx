'use client'

import * as React from 'react'
import QRCode from 'react-qr-code'
import { cn } from '@/lib/utils'

export interface QRCodeDisplayProps {
  /** The value to encode in the QR code */
  value: string
  /** Size of the QR code in pixels (default: 128) */
  size?: number
  /** Background color (default: white) */
  bgColor?: string
  /** Foreground color (default: black) */
  fgColor?: string
  /** Error correction level (default: M) */
  level?: 'L' | 'M' | 'Q' | 'H'
  /** Additional CSS classes */
  className?: string
}

export function QRCodeDisplay({
  value,
  size = 128,
  bgColor = '#FFFFFF',
  fgColor = '#000000',
  level = 'M',
  className = '',
}: QRCodeDisplayProps) {
  return (
    <div className={cn('inline-block p-4 bg-white rounded-xl shadow-sm', className)}>
      <QRCode
        value={value}
        size={size}
        bgColor={bgColor}
        fgColor={fgColor}
        level={level}
      />
    </div>
  )
}

export default QRCodeDisplay
