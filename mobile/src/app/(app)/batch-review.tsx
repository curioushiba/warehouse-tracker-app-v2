import React, { useState, useCallback } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useSQLiteContext } from 'expo-sqlite'
import { ArrowLeft } from 'lucide-react-native'
import { useAuth } from '@/contexts/AuthContext'
import { useDomain } from '@/contexts/DomainContext'
import { useBatchScan } from '@/contexts/BatchScanContext'
import { useSyncQueue } from '@/hooks/useSyncQueue'
import { BatchItemRow } from '@/components/domain/BatchItemRow'
import { BatchConfirmModal } from '@/components/domain/BatchConfirmModal'
import { Button } from '@/components/ui/Button'
import { clampQuantity } from '@/lib/constants'

export default function BatchReviewScreen() {
  const router = useRouter()
  const db = useSQLiteContext()
  const { user } = useAuth()
  const { domainId } = useDomain()
  const {
    items,
    transactionType,
    totalItems,
    totalUnits,
    updateQuantity,
    removeItem,
    clearBatch,
  } = useBatchScan()
  const { queueTransaction } = useSyncQueue(
    db,
    user?.id ?? null,
    domainId,
    true
  )

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleQuantityChange = useCallback(
    (itemId: string, newQuantity: number) => {
      const clamped = clampQuantity(newQuantity)
      if (clamped < 1) return
      updateQuantity(itemId, clamped)
    },
    [updateQuantity]
  )

  const handleRemove = useCallback(
    (itemId: string) => {
      removeItem(itemId)
    },
    [removeItem]
  )

  const handleConfirm = useCallback(async () => {
    setIsSubmitting(true)
    try {
      for (const batchItem of items) {
        queueTransaction({
          transactionType: transactionType,
          itemId: batchItem.itemId,
          quantity: batchItem.quantity,
        })
      }
      clearBatch()
      setIsModalOpen(false)
      router.replace({
        pathname: '/',
        params: { batchSuccess: String(items.length) },
      })
    } catch {
      // Error handling - stay on page
    } finally {
      setIsSubmitting(false)
    }
  }, [items, transactionType, queueTransaction, clearBatch, router])

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            testID="back-button"
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <ArrowLeft size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Batch Review</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No items in batch</Text>
          <Button
            label="Go to Scanner"
            onPress={() => router.back()}
            variant="primary"
            size="md"
          />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          testID="back-button"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Batch Review</Text>
        <Text style={styles.itemCount}>
          {totalItems} {totalItems === 1 ? 'item' : 'items'}
        </Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.itemId}
        renderItem={({ item: batchItem, index }) => (
          <BatchItemRow
            item={{
              id: batchItem.itemId,
              name: batchItem.item.name,
              quantity: batchItem.quantity,
              unit: batchItem.item.unit,
              currentStock: batchItem.item.current_stock,
            }}
            onQuantityChange={handleQuantityChange}
            onRemove={handleRemove}
            testID={`batch-row-${index}`}
          />
        )}
        contentContainerStyle={styles.listContent}
      />

      <View style={styles.footer}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Units:</Text>
          <Text style={styles.summaryValue}>{totalUnits}</Text>
        </View>
        <Button
          label="Confirm"
          onPress={() => setIsModalOpen(true)}
          variant="cta"
          size="lg"
          testID="confirm-button"
        />
      </View>

      <BatchConfirmModal
        isOpen={isModalOpen}
        transactionType={transactionType}
        itemCount={totalItems}
        totalUnits={totalUnits}
        onConfirm={handleConfirm}
        onCancel={() => setIsModalOpen(false)}
        isSubmitting={isSubmitting}
        testID="confirm-modal"
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  itemCount: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  listContent: {
    paddingBottom: 16,
  },
  footer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    padding: 16,
    gap: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
})
