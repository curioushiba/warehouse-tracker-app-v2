'use client'

import * as React from 'react'
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Alert,
} from '@/components/ui'
import { BarcodeScanner } from '@/components/scanner'
import { AlertCircle, Check } from 'lucide-react'

export interface BarcodeScannerModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Callback when modal is closed */
  onClose: () => void
  /** Callback when a barcode is scanned and confirmed */
  onScan: (code: string) => void
  /** Modal title (default: "Scan Barcode") */
  title?: string
  /** Description text shown above scanner */
  description?: string
}

export function BarcodeScannerModal({
  isOpen,
  onClose,
  onScan,
  title = 'Scan Barcode',
  description = 'Point the camera at a barcode to scan it',
}: BarcodeScannerModalProps) {
  const [scannedCode, setScannedCode] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (isOpen) {
      setScannedCode(null)
      setError(null)
    }
  }, [isOpen])

  const handleScan = (code: string) => {
    setScannedCode(code)
    setError(null)
  }

  const handleScannerError = (errorMsg: string) => {
    setError(errorMsg)
  }

  const handleConfirm = () => {
    if (scannedCode) {
      onScan(scannedCode)
      onClose()
    }
  }

  const handleRescan = () => {
    setScannedCode(null)
    setError(null)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalHeader showCloseButton onClose={onClose}>
        {title}
      </ModalHeader>
      <ModalBody>
        {scannedCode ? (
          // Show scanned result
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-success" />
            </div>
            <p className="text-foreground-muted mb-2">Scanned barcode:</p>
            <p className="text-xl font-mono font-bold text-foreground bg-secondary px-4 py-2 rounded-lg inline-block">
              {scannedCode}
            </p>
          </div>
        ) : (
          // Show scanner
          <>
            <p className="text-sm text-foreground-muted mb-4 text-center">
              {description}
            </p>
            <BarcodeScanner
              onScan={handleScan}
              onError={handleScannerError}
              aspectRatio={1}
              enableTorch
            />
          </>
        )}

        {error && (
          <Alert status="error" variant="subtle" className="mt-4">
            <AlertCircle className="w-4 h-4" />
            {error}
          </Alert>
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        {scannedCode && (
          <>
            <Button variant="outline" onClick={handleRescan}>
              Scan Again
            </Button>
            <Button variant="primary" onClick={handleConfirm}>
              Use This Code
            </Button>
          </>
        )}
      </ModalFooter>
    </Modal>
  )
}

export default BarcodeScannerModal
