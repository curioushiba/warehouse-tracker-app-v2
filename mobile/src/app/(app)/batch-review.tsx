import React, { useState, useCallback } from 'react'
import { View, Text, FlatList } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useSQLiteContext } from 'expo-sqlite'
import { ArrowDownToLine, ArrowUpFromLine } from 'lucide-react-native'
import { useAuth } from '@/contexts/AuthContext'
import { useDomain } from '@/contexts/DomainContext'
import { useBatchScan } from '@/contexts/BatchScanContext'
import { useSyncQueue } from '@/hooks/useSyncQueue'
import { useTheme } from '@/theme'
import { ScreenHeader } from '@/components/layout/ScreenHeader'
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
  const { colors, spacing, typography } = useTheme()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isCheckIn = transactionType === 'in'
  const typeBannerColor = isCheckIn ? colors.checkIn : colors.checkOut
  const typeLabel = isCheckIn ? 'CHECK IN' : 'CHECK OUT'
  const confirmLabel = isCheckIn ? 'Confirm Check In' : 'Confirm Check Out'

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

  const TypeIcon = isCheckIn ? ArrowDownToLine : ArrowUpFromLine

  if (items.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgPrimary }} edges={['top']}>
        <ScreenHeader
          title="Batch Review"
          onBack={() => router.back()}
          testID="screen-header"
        />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing[4], padding: spacing[6] }}>
          <Text
            style={{
              ...typography.lg,
              color: colors.textSecondary,
              fontWeight: typography.weight.medium,
            }}
          >
            No items in batch
          </Text>
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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgPrimary }} edges={['top']}>
      <ScreenHeader
        title="Batch Review"
        onBack={() => router.back()}
        rightContent={
          <Text
            style={{
              ...typography.base,
              color: colors.textSecondary,
              fontWeight: typography.weight.medium,
            }}
          >
            {totalItems} {totalItems === 1 ? 'item' : 'items'}
          </Text>
        }
        testID="screen-header"
      />

      {/* Transaction type banner */}
      <View
        testID="type-banner"
        style={{
          backgroundColor: typeBannerColor,
          paddingVertical: spacing[2],
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'center',
          gap: spacing[2],
        }}
      >
        <TypeIcon size={18} color={colors.textInverse} />
        <Text
          style={{
            ...typography.base,
            fontWeight: typography.weight.bold,
            color: colors.textInverse,
            letterSpacing: 1,
          }}
        >
          {typeLabel}
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
        contentContainerStyle={{ paddingBottom: spacing[4] }}
      />

      <View
        style={{
          backgroundColor: colors.surfacePrimary,
          borderTopWidth: 1,
          borderTopColor: colors.borderSubtle,
          padding: spacing[4],
          gap: spacing[3],
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text
            style={{
              ...typography.base,
              color: colors.textSecondary,
              fontWeight: typography.weight.medium,
            }}
          >
            Total Units:
          </Text>
          <Text
            style={{
              ...typography.xl,
              fontWeight: typography.weight.bold,
              color: colors.textPrimary,
            }}
          >
            {totalUnits}
          </Text>
        </View>
        <Button
          label={confirmLabel}
          onPress={() => setIsModalOpen(true)}
          variant={isCheckIn ? 'primary' : 'danger'}
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
