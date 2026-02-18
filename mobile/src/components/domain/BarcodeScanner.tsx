import React, { useCallback, useRef, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { Zap, ZapOff, X } from 'lucide-react-native'
import { SCAN_DEBOUNCE_MS } from '@/lib/constants'

export interface BarcodeScannerProps {
  onScan: (barcode: string) => void
  onClose?: () => void
  testID?: string
}

export function BarcodeScanner({ onScan, onClose, testID }: BarcodeScannerProps) {
  const [permission] = useCameraPermissions()
  const [flashEnabled, setFlashEnabled] = useState(false)
  const lastScanRef = useRef<number>(0)

  const handleBarcodeScanned = useCallback(
    (result: { data: string }) => {
      const now = Date.now()
      if (now - lastScanRef.current < SCAN_DEBOUNCE_MS) {
        return
      }
      lastScanRef.current = now
      onScan(result.data)
    },
    [onScan]
  )

  if (!permission?.granted) {
    return (
      <View style={styles.container} testID={testID}>
        <Text style={styles.permissionText}>Camera permission required</Text>
      </View>
    )
  }

  return (
    <View style={styles.container} testID={testID}>
      <CameraView
        testID={`${testID ?? 'scanner'}-camera`}
        style={styles.camera}
        facing="back"
        enableTorch={flashEnabled}
        barcodeScannerSettings={{ barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'code39'] }}
        onBarcodeScanned={handleBarcodeScanned}
      />
      <View style={styles.controls}>
        <TouchableOpacity
          testID={`${testID ?? 'scanner'}-flash-toggle`}
          style={styles.controlButton}
          onPress={() => setFlashEnabled((prev) => !prev)}
        >
          {flashEnabled ? (
            <ZapOff size={24} color="#ffffff" />
          ) : (
            <Zap size={24} color="#ffffff" />
          )}
        </TouchableOpacity>
        {onClose && (
          <TouchableOpacity
            testID={`${testID ?? 'scanner'}-close`}
            style={styles.controlButton}
            onPress={onClose}
          >
            <X size={24} color="#ffffff" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  camera: {
    flex: 1,
  },
  permissionText: {
    color: '#ffffff',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
  controls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
