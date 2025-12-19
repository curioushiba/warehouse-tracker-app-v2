'use client'

import { useState, useRef } from 'react'
import QRCode from 'react-qr-code'
import { toPng } from 'html-to-image'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Download } from 'lucide-react'
import type { AttStore } from '@/lib/supabase/attendance-types'

interface StoreQRCardProps {
  store: AttStore
  baseUrl?: string
}

export function StoreQRCard({ store, baseUrl }: StoreQRCardProps) {
  const [isDownloading, setIsDownloading] = useState(false)
  const qrRef = useRef<HTMLDivElement>(null)

  // Build the URL that will be encoded in QR
  const qrValue = store.qr_code
    ? `${baseUrl ?? (typeof window !== 'undefined' ? window.location.origin : '')}/attendance/checkin?store=${store.qr_code}`
    : ''

  const handleDownload = async () => {
    if (!qrRef.current || !store.qr_code) return

    setIsDownloading(true)
    try {
      const dataUrl = await toPng(qrRef.current, {
        cacheBust: true,
        backgroundColor: '#ffffff',
        pixelRatio: 3, // High resolution
      })

      const link = document.createElement('a')
      link.download = `${store.name.replace(/\s+/g, '-').toLowerCase()}-qr-code.png`
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error('Failed to download QR code:', err)
    } finally {
      setIsDownloading(false)
    }
  }

  if (!store.qr_code) {
    return (
      <Card>
        <CardBody className="text-center py-8">
          <p className="text-gray-500 mb-4">No QR code generated</p>
          <p className="text-sm text-gray-400">
            Generate a QR code to enable clock-in for this store
          </p>
        </CardBody>
      </Card>
    )
  }

  return (
    <Card>
      <CardBody>
        <div className="flex flex-col items-center">
          {/* QR Code with label (for download) */}
          <div
            ref={qrRef}
            className="bg-white p-6 rounded-lg"
            style={{ width: 'fit-content' }}
          >
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{store.name}</h3>
              <p className="text-sm text-gray-500">{store.qr_code}</p>
            </div>
            <QRCode
              value={qrValue}
              size={200}
              level="H"
              style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
            />
            <p className="text-xs text-gray-400 text-center mt-3">
              Scan to clock in
            </p>
          </div>

          {/* Download button */}
          <Button
            variant="secondary"
            size="sm"
            className="mt-4"
            onClick={handleDownload}
            isLoading={isDownloading}
          >
            <Download className="w-4 h-4 mr-2" />
            Download QR Code
          </Button>
        </div>
      </CardBody>
    </Card>
  )
}
