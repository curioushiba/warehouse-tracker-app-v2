import React, { useCallback, useEffect, useRef, useState } from 'react'
import { View, Text, Linking } from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { Zap, ZapOff, X, Settings } from 'lucide-react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'
import { useTheme } from '@/theme'
import { SCAN_DEBOUNCE_MS } from '@/lib/constants'
import { AnimatedPressable } from '@/components/ui/AnimatedPressable'

export interface BarcodeScannerProps {
  onScan: (barcode: string) => void
  onClose?: () => void
  testID?: string
}

const RETICLE_SIZE = 250
const CORNER_LENGTH = 30
const CORNER_WIDTH = 3

function ScanReticle() {
  const { colors } = useTheme()
  const pulseOpacity = useSharedValue(1)

  useEffect(() => {
    pulseOpacity.value = withRepeat(
      withTiming(0.5, { duration: 1500 }),
      -1,
      true
    )
  }, [pulseOpacity])

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }))

  const cornerColor = colors.textInverse

  return (
    <View
      testID="scanner-reticle"
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: RETICLE_SIZE,
        height: RETICLE_SIZE,
        marginTop: -RETICLE_SIZE / 2,
        marginLeft: -RETICLE_SIZE / 2,
      }}
    >
      <Animated.View style={[{ width: '100%', height: '100%' }, animatedStyle]}>
        {/* Top-left */}
        <View style={{
          position: 'absolute', top: 0, left: 0,
          width: CORNER_LENGTH, height: CORNER_WIDTH,
          backgroundColor: cornerColor,
        }} />
        <View style={{
          position: 'absolute', top: 0, left: 0,
          width: CORNER_WIDTH, height: CORNER_LENGTH,
          backgroundColor: cornerColor,
        }} />
        {/* Top-right */}
        <View style={{
          position: 'absolute', top: 0, right: 0,
          width: CORNER_LENGTH, height: CORNER_WIDTH,
          backgroundColor: cornerColor,
        }} />
        <View style={{
          position: 'absolute', top: 0, right: 0,
          width: CORNER_WIDTH, height: CORNER_LENGTH,
          backgroundColor: cornerColor,
        }} />
        {/* Bottom-left */}
        <View style={{
          position: 'absolute', bottom: 0, left: 0,
          width: CORNER_LENGTH, height: CORNER_WIDTH,
          backgroundColor: cornerColor,
        }} />
        <View style={{
          position: 'absolute', bottom: 0, left: 0,
          width: CORNER_WIDTH, height: CORNER_LENGTH,
          backgroundColor: cornerColor,
        }} />
        {/* Bottom-right */}
        <View style={{
          position: 'absolute', bottom: 0, right: 0,
          width: CORNER_LENGTH, height: CORNER_WIDTH,
          backgroundColor: cornerColor,
        }} />
        <View style={{
          position: 'absolute', bottom: 0, right: 0,
          width: CORNER_WIDTH, height: CORNER_LENGTH,
          backgroundColor: cornerColor,
        }} />
      </Animated.View>
    </View>
  )
}

export function BarcodeScanner({ onScan, onClose, testID }: BarcodeScannerProps) {
  const [permission] = useCameraPermissions()
  const [flashEnabled, setFlashEnabled] = useState(false)
  const lastScanRef = useRef<number>(0)
  const { colors, spacing, typography, radii } = useTheme()

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
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bgInverse,
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing[6],
        }}
        testID={testID}
      >
        <Text
          style={{
            color: colors.textInverse,
            fontSize: typography.lg.fontSize,
            lineHeight: typography.lg.lineHeight,
            textAlign: 'center',
            marginBottom: spacing[4],
          }}
        >
          Camera permission required
        </Text>
        <AnimatedPressable
          testID={`${testID ?? 'scanner'}-open-settings`}
          onPress={() => Linking.openSettings()}
          style={{
            backgroundColor: colors.brandPrimary,
            paddingVertical: spacing[3],
            paddingHorizontal: spacing[6],
            borderRadius: radii.md,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
            <Settings size={18} color={colors.brandText} />
            <Text
              style={{
                color: colors.brandText,
                fontSize: typography.base.fontSize,
                fontWeight: typography.weight.semibold,
              }}
            >
              Open Settings
            </Text>
          </View>
        </AnimatedPressable>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgInverse }} testID={testID}>
      <CameraView
        testID={`${testID ?? 'scanner'}-camera`}
        style={{ flex: 1 }}
        facing="back"
        enableTorch={flashEnabled}
        barcodeScannerSettings={{ barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'code39'] }}
        onBarcodeScanned={handleBarcodeScanned}
      />
      <ScanReticle />
      <View
        style={{
          position: 'absolute',
          bottom: 40,
          left: 0,
          right: 0,
          flexDirection: 'row',
          justifyContent: 'center',
          gap: spacing[6],
        }}
      >
        <AnimatedPressable
          testID={`${testID ?? 'scanner'}-flash-toggle`}
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: colors.overlay,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onPress={() => setFlashEnabled((prev) => !prev)}
        >
          {flashEnabled ? (
            <ZapOff size={24} color={colors.textInverse} />
          ) : (
            <Zap size={24} color={colors.textInverse} />
          )}
        </AnimatedPressable>
        {onClose && (
          <AnimatedPressable
            testID={`${testID ?? 'scanner'}-close`}
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: colors.overlay,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onPress={onClose}
          >
            <X size={24} color={colors.textInverse} />
          </AnimatedPressable>
        )}
      </View>
    </View>
  )
}
