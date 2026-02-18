import React, { useState, useCallback, useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useSQLiteContext } from 'expo-sqlite'
import Toast from 'react-native-toast-message'
import { useBatchScan, type BatchTransactionType } from '@/contexts/BatchScanContext'
import { useScanFeedback } from '@/hooks/useScanFeedback'
import { getCachedItemByBarcode } from '@/lib/db/items-cache'
import { BarcodeScanner } from '@/components/domain/BarcodeScanner'
import { ScanSuccessOverlay } from '@/components/domain/ScanSuccessOverlay'
import { BatchMiniList } from '@/components/domain/BatchMiniList'
import { ItemSearchAutocomplete } from '@/components/domain/ItemSearchAutocomplete'
import { Button } from '@/components/ui/Button'

type ScanMode = 'scan' | 'search'

export default function ScanScreen() {
  const db = useSQLiteContext()
  const router = useRouter()
  const params = useLocalSearchParams<{ type?: string }>()
  const {
    items,
    addItem,
    hasItem,
    totalItems,
    transactionType,
    setTransactionType,
  } = useBatchScan()
  const {
    triggerFeedback,
    triggerDuplicateAlert,
    feedbackItem,
    isVisible: feedbackVisible,
  } = useScanFeedback()

  const [mode, setMode] = useState<ScanMode>('scan')

  // Set transaction type from URL params on mount
  useEffect(() => {
    if (params.type === 'in' || params.type === 'out') {
      setTransactionType(params.type)
    }
  }, [params.type, setTransactionType])

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

      // Convert CachedItem to Item shape for addItem
      const itemForBatch = {
        id: item.id,
        sku: item.sku,
        name: item.name,
        description: item.description ?? null,
        category_id: item.categoryId ?? null,
        location_id: item.locationId ?? null,
        unit: item.unit,
        current_stock: item.currentStock,
        min_stock: item.minStock,
        max_stock: item.maxStock ?? null,
        unit_price: item.unitPrice ?? null,
        barcode: item.barcode ?? null,
        image_url: item.imageUrl ?? null,
        is_archived: item.isArchived ?? false,
        version: item.version,
        created_at: item.updatedAt,
        updated_at: item.updatedAt,
      }

      const added = addItem(itemForBatch)
      if (added) {
        triggerFeedback({
          itemName: item.name,
          itemImageUrl: item.imageUrl ?? null,
        })
      } else {
        triggerDuplicateAlert()
      }
    },
    [addItem, hasItem, triggerFeedback, triggerDuplicateAlert]
  )

  const handleManualSelect = useCallback(
    (selected: { id: string; name: string; sku: string }) => {
      const item = getCachedItemByBarcode(db, selected.sku)
      if (item) {
        const itemForBatch = {
          id: item.id,
          sku: item.sku,
          name: item.name,
          description: item.description ?? null,
          category_id: item.categoryId ?? null,
          location_id: item.locationId ?? null,
          unit: item.unit,
          current_stock: item.currentStock,
          min_stock: item.minStock,
          max_stock: item.maxStock ?? null,
          unit_price: item.unitPrice ?? null,
          barcode: item.barcode ?? null,
          image_url: item.imageUrl ?? null,
          is_archived: item.isArchived ?? false,
          version: item.version,
          created_at: item.updatedAt,
          updated_at: item.updatedAt,
        }
        const added = addItem(itemForBatch)
        if (!added) {
          Toast.show({ type: 'info', text1: 'Item already in batch' })
        }
      }
    },
    [addItem]
  )

  const miniListItems = items.map((bi) => ({
    id: bi.itemId,
    name: bi.item.name,
    quantity: bi.quantity,
  }))

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Transaction type toggle */}
      <View style={styles.typeToggleRow}>
        <TouchableOpacity
          style={[
            styles.typeToggleButton,
            transactionType === 'in' && styles.typeToggleActive,
          ]}
          onPress={() => setTransactionType('in')}
        >
          <Text
            style={[
              styles.typeToggleText,
              transactionType === 'in' && styles.typeToggleTextActive,
            ]}
          >
            In
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.typeToggleButton,
            transactionType === 'out' && styles.typeToggleActiveOut,
          ]}
          onPress={() => setTransactionType('out')}
        >
          <Text
            style={[
              styles.typeToggleText,
              transactionType === 'out' && styles.typeToggleTextActive,
            ]}
          >
            Out
          </Text>
        </TouchableOpacity>
      </View>

      {/* Mode toggle: Scan / Search */}
      <View style={styles.modeToggleRow}>
        <TouchableOpacity
          style={[styles.modeTab, mode === 'scan' && styles.modeTabActive]}
          onPress={() => setMode('scan')}
        >
          <Text
            style={[
              styles.modeTabText,
              mode === 'scan' && styles.modeTabTextActive,
            ]}
          >
            Scan
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeTab, mode === 'search' && styles.modeTabActive]}
          onPress={() => setMode('search')}
        >
          <Text
            style={[
              styles.modeTabText,
              mode === 'search' && styles.modeTabTextActive,
            ]}
          >
            Search
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main content area */}
      <View style={styles.scanArea}>
        {mode === 'scan' ? (
          <BarcodeScanner
            onScan={handleBarcodeScan}
            testID="barcode-scanner"
          />
        ) : (
          <View style={styles.searchContainer} testID="manual-search">
            <ItemSearchAutocomplete
              items={[]}
              onSelect={handleManualSelect}
              placeholder="Search by name, SKU, or barcode..."
              testID="item-search-autocomplete"
            />
          </View>
        )}

        {/* Scan success overlay */}
        <ScanSuccessOverlay
          item={feedbackItem ? { name: feedbackItem.itemName, imageUrl: feedbackItem.itemImageUrl ?? undefined } : null}
          isVisible={feedbackVisible}
          testID="scan-overlay"
        />
      </View>

      {/* Batch mini-list + review button */}
      <View style={styles.bottomSection}>
        <BatchMiniList items={miniListItems} testID="batch-mini-list" />
        {totalItems > 0 && (
          <View style={styles.reviewButtonContainer}>
            <Button
              label="Review Batch"
              onPress={() => router.push('/batch-review')}
              variant="cta"
              size="lg"
              testID="review-batch-button"
            />
          </View>
        )}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  typeToggleRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  typeToggleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  typeToggleActive: {
    backgroundColor: '#16a34a',
    borderColor: '#16a34a',
  },
  typeToggleActiveOut: {
    backgroundColor: '#dc2626',
    borderColor: '#dc2626',
  },
  typeToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  typeToggleTextActive: {
    color: '#FFFFFF',
  },
  modeToggleRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  modeTabActive: {
    backgroundColor: '#1F2937',
  },
  modeTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  modeTabTextActive: {
    color: '#FFFFFF',
  },
  scanArea: {
    flex: 1,
    position: 'relative',
  },
  searchContainer: {
    flex: 1,
    padding: 16,
  },
  bottomSection: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  reviewButtonContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
})
