'use client'

import * as React from 'react'
import { toPng } from 'html-to-image'
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Alert,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from '@/components/ui'
import { QRCodeDisplay } from './QRCodeDisplay'
import { BarcodeScannerModal } from './BarcodeScannerModal'
import { PrintableLabel } from './PrintableLabel'
import { generatePtCode, registerBarcode, clearBarcode } from '@/lib/actions/items'
import type { Item } from '@/lib/supabase/types'
import {
  QrCode,
  Scan,
  Download,
  Trash2,
  Plus,
  AlertCircle,
  Barcode,
} from 'lucide-react'

export interface ManageCodesCardProps {
  /** The item to manage codes for */
  item: Item
  /** Callback when item is updated (barcode changed) */
  onItemUpdate: (item: Item) => void
}

export function ManageCodesCard({ item, onItemUpdate }: ManageCodesCardProps) {
  const [scannerOpen, setScannerOpen] = React.useState(false)
  const [previewModalOpen, setPreviewModalOpen] = React.useState(false)
  const [confirmClearOpen, setConfirmClearOpen] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const [isDownloading, setIsDownloading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const labelRef = React.useRef<HTMLDivElement>(null)

  const hasBarcode = !!item.barcode
  // Check for PT- (new) or HRG- (legacy) generated codes
  const isGeneratedCode = item.barcode?.startsWith('PT-') || item.barcode?.startsWith('HRG-')

  // Handle generating PT code
  const handleGeneratePtCode = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await generatePtCode(item.id)
      if (result.success) {
        onItemUpdate(result.data)
      } else {
        setError(result.error)
      }
    } catch {
      setError('Failed to generate PT code')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle registering scanned barcode
  const handleRegisterBarcode = async (code: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await registerBarcode(item.id, code)
      if (result.success) {
        onItemUpdate(result.data)
      } else {
        setError(result.error)
      }
    } catch {
      setError('Failed to register barcode')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle clearing barcode
  const handleClearBarcode = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await clearBarcode(item.id)
      if (result.success) {
        onItemUpdate(result.data)
        setConfirmClearOpen(false)
      } else {
        setError(result.error)
      }
    } catch {
      setError('Failed to clear barcode')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle opening preview modal
  const handleOpenPreview = () => {
    setPreviewModalOpen(true)
  }

  // Handle download as PNG
  const executeDownload = async () => {
    if (!labelRef.current) return

    setIsDownloading(true)

    try {
      const dataUrl = await toPng(labelRef.current, {
        cacheBust: true,
        pixelRatio: 2, // Higher resolution for better quality
        backgroundColor: '#ffffff',
      })

      // Create download link
      const link = document.createElement('a')
      link.download = `${item.sku}-label.png`
      link.href = dataUrl
      link.click()

      setPreviewModalOpen(false)
    } catch {
      setError('Failed to download image')
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <>
      <Card variant="elevated">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Manage Codes</h3>
          </div>
          <p className="text-sm text-foreground-muted mt-1">
            Register barcodes or generate QR codes for this item
          </p>
        </CardHeader>
        <CardBody className="pt-4">
          {error && (
            <Alert status="error" variant="subtle" className="mb-4">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </Alert>
          )}

          {hasBarcode ? (
            // Display current barcode/QR code
            <div className="space-y-4">
              <div className="flex flex-col items-center">
                <QRCodeDisplay value={item.barcode!} size={160} />
                <div className="mt-3 text-center">
                  <p className="font-mono text-lg font-bold text-foreground">
                    {item.barcode}
                  </p>
                  <p className="text-sm text-foreground-muted mt-1">
                    {isGeneratedCode ? 'Generated QR Code' : 'Manufacturer Barcode'}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  leftIcon={<Download className="w-4 h-4" />}
                  onClick={handleOpenPreview}
                  className="flex-1"
                >
                  Download Label
                </Button>
                <Button
                  variant="outline"
                  leftIcon={<Trash2 className="w-4 h-4" />}
                  onClick={() => setConfirmClearOpen(true)}
                  className="text-error hover:bg-error/10"
                >
                  Clear
                </Button>
              </div>
            </div>
          ) : (
            // No barcode - show options to add one
            <div className="space-y-4">
              <div className="text-center py-6 bg-secondary rounded-xl">
                <Barcode className="w-12 h-12 text-foreground-muted/50 mx-auto mb-3" />
                <p className="text-foreground-muted">
                  No barcode assigned to this item
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  leftIcon={<Scan className="w-4 h-4" />}
                  onClick={() => setScannerOpen(true)}
                  disabled={isLoading || item.is_archived}
                >
                  Scan Barcode
                </Button>
                <Button
                  variant="primary"
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={handleGeneratePtCode}
                  isLoading={isLoading}
                  disabled={isLoading || item.is_archived}
                >
                  Generate QR Code
                </Button>
              </div>

              {item.is_archived && (
                <p className="text-sm text-warning text-center">
                  Cannot modify codes for archived items
                </p>
              )}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Scanner Modal */}
      <BarcodeScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleRegisterBarcode}
        title="Scan Manufacturer Barcode"
        description="Scan the manufacturer barcode on the product packaging"
      />

      {/* Image Preview Modal */}
      <Modal isOpen={previewModalOpen} onClose={() => setPreviewModalOpen(false)} size="sm">
        <ModalHeader showCloseButton onClose={() => setPreviewModalOpen(false)}>
          Image Preview
        </ModalHeader>
        <ModalBody>
          <div className="flex justify-center">
            <div ref={labelRef}>
              <PrintableLabel
                barcode={item.barcode || ''}
                itemName={item.name}
                sku={item.sku}
                unit={item.unit}
              />
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setPreviewModalOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            leftIcon={<Download className="w-4 h-4" />}
            onClick={executeDownload}
            isLoading={isDownloading}
          >
            Download
          </Button>
        </ModalFooter>
      </Modal>

      {/* Confirm Clear Modal */}
      <Modal isOpen={confirmClearOpen} onClose={() => setConfirmClearOpen(false)} size="sm">
        <ModalHeader showCloseButton onClose={() => setConfirmClearOpen(false)}>
          Clear Barcode
        </ModalHeader>
        <ModalBody>
          <div className="text-center">
            <div className="w-16 h-16 bg-warning/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-warning" />
            </div>
            <p className="text-foreground mb-2">
              Are you sure you want to clear the barcode for <strong>{item.name}</strong>?
            </p>
            <p className="text-sm text-foreground-muted">
              This will remove the {isGeneratedCode ? 'generated QR code' : 'registered barcode'}.
              You can assign a new code afterwards.
            </p>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setConfirmClearOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleClearBarcode}
            isLoading={isLoading}
          >
            Clear Barcode
          </Button>
        </ModalFooter>
      </Modal>
    </>
  )
}

export default ManageCodesCard
