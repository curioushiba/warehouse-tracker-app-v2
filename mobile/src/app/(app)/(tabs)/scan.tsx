import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { View, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useSQLiteContext } from 'expo-sqlite'
import Animated, {
  FadeIn,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { ClipboardCheck, RefreshCw } from 'lucide-react-native'
import Toast from 'react-native-toast-message'
import { useBatchScan, type BatchTransactionType } from '@/contexts/BatchScanContext'
import { useScanFeedback } from '@/hooks/useScanFeedback'
import { useDomain } from '@/contexts/DomainContext'
import { useItemCache } from '@/hooks/useItemCache'
import { getCachedItemByBarcode, getCachedItem } from '@/lib/db/items-cache'
import { cachedItemToItem } from '@/lib/db/conversions'
import { useTheme } from '@/theme'
import { BarcodeScanner } from '@/components/domain/BarcodeScanner'
import { ScanSuccessOverlay } from '@/components/domain/ScanSuccessOverlay'
import { BatchMiniList } from '@/components/domain/BatchMiniList'
import { ItemSearchAutocomplete } from '@/components/domain/ItemSearchAutocomplete'
import { AnimatedPressable } from '@/components/ui/AnimatedPressable'
import { Button } from '@/components/ui/Button'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import type { AutocompleteItem } from '@/components/domain/ItemSearchAutocomplete'

type ScanMode = 'scan' | 'search'

const TYPE_OPTIONS = [
  { label: 'IN', value: 'in' },
  { label: 'OUT', value: 'out' },
]

const MODE_OPTIONS = [
  { label: 'Scan', value: 'scan' },
  { label: 'Search', value: 'search' },
]

export default function ScanScreen() {
  const db = useSQLiteContext()
  const router = useRouter()
  const params = useLocalSearchParams<{ type?: string }>()
  const {
    items,
    addItem,
    incrementItem,
    totalItems,
    transactionType,
    setTransactionType,
  } = useBatchScan()
  const {
    triggerFeedback,
    feedbackItem,
    isVisible: feedbackVisible,
  } = useScanFeedback()
  const { colors, spacing, typography, shadows, radii } = useTheme()
  const { domainId } = useDomain()
  const { items: cachedItems, isLoading: isItemCacheLoading, error: itemCacheError, refreshItems } = useItemCache(db, domainId)

  const [mode, setMode] = useState<ScanMode>('scan')
  const [showInstruction, setShowInstruction] = useState(true)

  // Batch count bounce animation
  const pillScale = useSharedValue(1)
  const prevTotalItems = useRef(totalItems)

  useEffect(() => {
    if (totalItems !== prevTotalItems.current && totalItems > 0) {
      pillScale.value = withSequence(
        withTiming(1.1, { duration: 100 }),
        withTiming(1.0, { duration: 100 })
      )
    }
    prevTotalItems.current = totalItems
  }, [totalItems, pillScale])

  const pillAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pillScale.value }],
  }))

  // Auto-dismiss instruction text after 3s
  useEffect(() => {
    if (mode === 'scan') {
      setShowInstruction(true)
      const timer = setTimeout(() => setShowInstruction(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [mode])

  // Map cached items for autocomplete
  const autocompleteItems = useMemo<AutocompleteItem[]>(
    () => cachedItems.map((item) => ({
      id: item.id,
      name: item.name,
      sku: item.sku,
      barcode: item.barcode,
    })),
    [cachedItems]
  )

  // Set transaction type from URL params on mount
  useEffect(() => {
    if (params.type === 'in' || params.type === 'out') {
      setTransactionType(params.type)
    }
  }, [params.type, setTransactionType])

  const batchHasItems = items.length > 0

  const handleBarcodeScan = useCallback(
    (barcode: string) => {
      const item = getCachedItemByBarcode(db, barcode)
      if (!item) {
        Toast.show({
          type: 'error',
          text1: 'Item not found',
          text2: `No item found for barcode: ${barcode}`,
        })
        return
      }

      const added = addItem(cachedItemToItem(item))
      if (!added) {
        incrementItem(item.id)
        Toast.show({ type: 'success', text1: 'Quantity updated' })
      }
      triggerFeedback({
        itemName: item.name,
        itemImageUrl: item.imageUrl ?? null,
      })
    },
    [addItem, incrementItem, triggerFeedback, db]
  )

  const handleManualSelect = useCallback(
    (selected: { id: string; name: string; sku: string }) => {
      const item = getCachedItem(db, selected.id)
      if (!item) return

      const added = addItem(cachedItemToItem(item))
      if (!added) {
        incrementItem(item.id)
        Toast.show({ type: 'success', text1: 'Quantity updated' })
      }
    },
    [addItem, incrementItem, db]
  )

  const miniListItems = items.map((bi) => ({
    id: bi.itemId,
    name: bi.item.name,
    quantity: bi.quantity,
  }))

  // SegmentedControl colored active states for transaction type
  const typeActiveColor = transactionType === 'in' ? colors.checkIn : colors.checkOut
  const typeActiveTextColor = colors.textInverse

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgPrimary }} edges={['top']}>
      {/* Controls row: type + mode segmented controls */}
      <View
        style={{
          flexDirection: 'row',
          paddingHorizontal: spacing[4],
          paddingVertical: spacing[2],
          gap: spacing[2],
          alignItems: 'center',
        }}
      >
        <View style={{ flex: 1 }}>
          <SegmentedControl
            options={TYPE_OPTIONS}
            value={transactionType}
            onValueChange={(val) => setTransactionType(val as BatchTransactionType)}
            activeColor={typeActiveColor}
            activeTextColor={typeActiveTextColor}
            size="sm"
            testID="type-control"
          />
        </View>
        <View style={{ flex: 1 }}>
          <SegmentedControl
            options={MODE_OPTIONS}
            value={mode}
            onValueChange={(val) => setMode(val as ScanMode)}
            size="sm"
            testID="mode-control"
          />
        </View>
      </View>

      {/* Lock notice when batch has items */}
      {batchHasItems && (
        <Text
          testID="type-lock-notice"
          style={{
            ...typography.sm,
            color: colors.textTertiary,
            textAlign: 'center',
            paddingBottom: spacing[1],
          }}
        >
          Lock: items in batch
        </Text>
      )}

      {/* Main content area with cross-fade */}
      <View style={{ flex: 1, position: 'relative' }}>
        <Animated.View
          key={mode}
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          style={{ flex: 1 }}
        >
          {mode === 'scan' ? (
            <View style={{ flex: 1, position: 'relative' }}>
              <BarcodeScanner
                onScan={handleBarcodeScan}
                testID="barcode-scanner"
              />
              {/* Instruction text with auto-dismiss */}
              {showInstruction && (
                <Animated.View
                  entering={FadeIn.duration(200)}
                  style={{
                    position: 'absolute',
                    top: spacing[4],
                    left: 0,
                    right: 0,
                    alignItems: 'center',
                  }}
                >
                  <Text
                    testID="scan-instruction"
                    style={{
                      ...typography.sm,
                      color: colors.textInverse,
                      backgroundColor: colors.overlay,
                      paddingHorizontal: spacing[4],
                      paddingVertical: spacing[2],
                      borderRadius: radii.lg,
                      overflow: 'hidden',
                    }}
                  >
                    Point camera at barcode
                  </Text>
                </Animated.View>
              )}
            </View>
          ) : (
            <View style={{ flex: 1, padding: spacing[4] }} testID="manual-search">
              {itemCacheError && (
                <View
                  testID="item-cache-error"
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: colors.errorBg,
                    borderRadius: radii.md,
                    padding: spacing[3],
                    marginBottom: spacing[3],
                    gap: spacing[2],
                  }}
                >
                  <Text
                    style={{
                      ...typography.sm,
                      color: colors.errorText,
                      flex: 1,
                    }}
                  >
                    {itemCacheError}
                  </Text>
                  <AnimatedPressable
                    testID="item-cache-retry"
                    onPress={refreshItems}
                    style={{
                      padding: spacing[2],
                    }}
                  >
                    <RefreshCw size={16} color={colors.errorText} />
                  </AnimatedPressable>
                </View>
              )}
              <ItemSearchAutocomplete
                items={autocompleteItems}
                onSelect={handleManualSelect}
                placeholder="Search by name, SKU, or barcode..."
                isLoading={isItemCacheLoading}
                testID="item-search-autocomplete"
              />
            </View>
          )}
        </Animated.View>

        {/* Scan success overlay */}
        <ScanSuccessOverlay
          item={feedbackItem ? { name: feedbackItem.itemName, imageUrl: feedbackItem.itemImageUrl ?? undefined } : null}
          isVisible={feedbackVisible}
          testID="scan-overlay"
        />

        {/* Floating batch count pill with bounce animation */}
        {totalItems > 0 && mode === 'scan' && (
          <Animated.View
            testID="batch-count-pill"
            style={[
              {
                position: 'absolute',
                bottom: spacing[4],
                right: spacing[4],
                backgroundColor: colors.brandPrimary,
                borderRadius: radii.full,
                paddingHorizontal: spacing[4],
                paddingVertical: spacing[2],
              },
              pillAnimatedStyle,
            ]}
          >
            <Text
              style={{
                ...typography.base,
                fontWeight: typography.weight.bold,
                color: colors.brandText,
              }}
            >
              {totalItems} item{totalItems !== 1 ? 's' : ''}
            </Text>
          </Animated.View>
        )}
      </View>

      {/* Bottom panel with shadow */}
      <View
        style={{
          backgroundColor: colors.surfacePrimary,
          borderTopWidth: 1,
          borderTopColor: colors.borderSubtle,
          ...shadows.lg,
        }}
      >
        <BatchMiniList items={miniListItems} testID="batch-mini-list" />
        {totalItems > 0 && (
          <View style={{ paddingHorizontal: spacing[4], paddingBottom: spacing[4] }}>
            <Button
              label="Review Batch"
              onPress={() => router.push('/batch-review')}
              variant="cta"
              size="lg"
              leftIcon={<ClipboardCheck size={18} color={colors.ctaText} />}
              testID="review-batch-button"
            />
          </View>
        )}
      </View>
    </SafeAreaView>
  )
}
