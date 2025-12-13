'use client'

import * as React from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats, Html5QrcodeScannerState } from 'html5-qrcode'
import { Camera, CameraOff, Flashlight, FlashlightOff, RefreshCw } from 'lucide-react'
import { Button, IconButton, Alert } from '@/components/ui'

interface BarcodeScannerProps {
  /** Callback when a barcode/QR code is scanned */
  onScan: (code: string) => void
  /** Callback when an error occurs */
  onError?: (error: string) => void
  /** Width of the scanner viewport (default: 100%) */
  width?: string | number
  /** Aspect ratio of the scanner viewport (default: 1) */
  aspectRatio?: number
  /** Whether to enable torch/flash control (if device supports it) */
  enableTorch?: boolean
  /** Custom class name for the container */
  className?: string
}

type CameraState = 'initializing' | 'ready' | 'scanning' | 'error' | 'permission_denied'

export function BarcodeScanner({
  onScan,
  onError,
  width = '100%',
  aspectRatio = 1,
  enableTorch = true,
  className = '',
}: BarcodeScannerProps) {
  const [cameraState, setCameraState] = React.useState<CameraState>('initializing')
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [torchOn, setTorchOn] = React.useState(false)
  const [hasTorchCapability, setHasTorchCapability] = React.useState(false)

  const scannerRef = React.useRef<Html5Qrcode | null>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const scannerId = 'html5-qrcode-scanner'

  // Cleanup function
  const stopScanner = React.useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState()
        if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
          await scannerRef.current.stop()
        }
        scannerRef.current.clear()
      } catch (err) {
        // Ignore cleanup errors
        console.warn('Error stopping scanner:', err)
      }
    }
  }, [])

  // Initialize scanner
  const startScanner = React.useCallback(async () => {
    setCameraState('initializing')
    setErrorMessage(null)

    // Stop any existing scanner first
    await stopScanner()

    try {
      // Create new scanner instance
      scannerRef.current = new Html5Qrcode(scannerId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
        ],
        verbose: false,
      })

      // Get camera capabilities
      const devices = await Html5Qrcode.getCameras()
      if (devices.length === 0) {
        throw new Error('No cameras found on this device')
      }

      // Prefer back camera
      const backCamera = devices.find(
        (d) => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('rear')
      )
      const cameraId = backCamera?.id || devices[0].id

      // Start scanning
      await scannerRef.current.start(
        cameraId,
        {
          fps: 10,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight)
            const size = Math.floor(minEdge * 0.7)
            return { width: size, height: size }
          },
          aspectRatio,
        },
        (decodedText) => {
          // Success callback
          onScan(decodedText)
        },
        () => {
          // Error callback (fired for every frame without code)
          // Intentionally empty - we only care about successful scans
        }
      )

      // Check for torch capability
      try {
        const capabilities = scannerRef.current.getRunningTrackCameraCapabilities()
        if (capabilities.torchFeature().isSupported()) {
          setHasTorchCapability(true)
        }
      } catch {
        setHasTorchCapability(false)
      }

      setCameraState('scanning')
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to start camera'

      // Check for permission errors
      if (error.toLowerCase().includes('permission') || error.toLowerCase().includes('notallowed')) {
        setCameraState('permission_denied')
        setErrorMessage('Camera permission denied. Please allow camera access to scan barcodes.')
      } else {
        setCameraState('error')
        setErrorMessage(error)
      }

      onError?.(error)
    }
  }, [aspectRatio, onScan, onError, stopScanner])

  // Toggle torch
  const toggleTorch = React.useCallback(async () => {
    if (!scannerRef.current || !hasTorchCapability) return

    try {
      const capabilities = scannerRef.current.getRunningTrackCameraCapabilities()
      const torch = capabilities.torchFeature()

      if (torchOn) {
        await torch.apply(false)
        setTorchOn(false)
      } else {
        await torch.apply(true)
        setTorchOn(true)
      }
    } catch (err) {
      console.error('Failed to toggle torch:', err)
    }
  }, [torchOn, hasTorchCapability])

  // Initialize on mount
  React.useEffect(() => {
    startScanner()

    return () => {
      stopScanner()
    }
  }, [startScanner, stopScanner])

  return (
    <div className={`relative ${className}`} style={{ width }}>
      {/* Scanner viewport */}
      <div
        id={scannerId}
        ref={containerRef}
        className="overflow-hidden rounded-2xl bg-neutral-900"
        style={{ aspectRatio }}
      />

      {/* State overlays */}
      {cameraState === 'initializing' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-900 rounded-2xl">
          <div className="animate-pulse">
            <Camera className="w-16 h-16 text-white/50" />
          </div>
          <p className="mt-4 text-sm text-white/60">Starting camera...</p>
        </div>
      )}

      {cameraState === 'permission_denied' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-900 rounded-2xl p-6">
          <CameraOff className="w-16 h-16 text-error mb-4" />
          <p className="text-sm text-white text-center mb-4">
            Camera access denied
          </p>
          <p className="text-xs text-white/60 text-center mb-6">
            Please enable camera permissions in your browser settings to scan barcodes.
          </p>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<RefreshCw className="w-4 h-4" />}
            onClick={startScanner}
          >
            Try Again
          </Button>
        </div>
      )}

      {cameraState === 'error' && errorMessage && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-900 rounded-2xl p-6">
          <CameraOff className="w-16 h-16 text-error mb-4" />
          <Alert status="error" variant="subtle" className="mb-4">
            {errorMessage}
          </Alert>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<RefreshCw className="w-4 h-4" />}
            onClick={startScanner}
          >
            Retry
          </Button>
        </div>
      )}

      {/* Controls overlay */}
      {cameraState === 'scanning' && (
        <>
          {/* Scan frame overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-64 h-64">
              {/* Corner markers */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-cta rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-cta rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-cta rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-cta rounded-br-lg" />

              {/* Scanning line animation */}
              <div className="absolute inset-x-2 top-1/2 h-0.5 bg-cta/70 animate-pulse" />
            </div>
          </div>

          {/* Torch toggle button */}
          {enableTorch && hasTorchCapability && (
            <div className="absolute top-4 right-4">
              <IconButton
                icon={torchOn ? <Flashlight className="w-5 h-5" /> : <FlashlightOff className="w-5 h-5" />}
                aria-label={torchOn ? 'Turn off flash' : 'Turn on flash'}
                variant="ghost"
                size="md"
                onClick={toggleTorch}
                className="bg-black/50 text-white hover:bg-black/70"
              />
            </div>
          )}

          {/* Instructions */}
          <div className="absolute bottom-4 inset-x-4">
            <div className="bg-black/70 rounded-xl px-4 py-3 text-center">
              <p className="text-white text-sm">
                Point camera at barcode or QR code
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default BarcodeScanner
