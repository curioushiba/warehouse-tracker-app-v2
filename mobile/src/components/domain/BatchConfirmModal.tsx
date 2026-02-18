import React from 'react'
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native'

export interface BatchConfirmModalProps {
  isOpen: boolean
  transactionType: 'in' | 'out'
  itemCount: number
  totalUnits: number
  onConfirm: () => void
  onCancel: () => void
  isSubmitting?: boolean
  testID?: string
}

const TYPE_LABELS: Record<'in' | 'out', { label: string; color: string }> = {
  in: { label: 'CHECK IN', color: '#16a34a' },
  out: { label: 'CHECK OUT', color: '#dc2626' },
}

export function BatchConfirmModal({
  isOpen,
  transactionType,
  itemCount,
  totalUnits,
  onConfirm,
  onCancel,
  isSubmitting = false,
  testID,
}: BatchConfirmModalProps) {
  if (!isOpen) {
    return null
  }

  const typeConfig = TYPE_LABELS[transactionType]

  return (
    <Modal transparent animationType="fade" visible={isOpen}>
      <View style={styles.backdrop} testID={testID}>
        <View style={styles.card}>
          <View style={[styles.typeBadge, { backgroundColor: typeConfig.color }]}>
            <Text style={styles.typeLabel}>{typeConfig.label}</Text>
          </View>

          <Text style={styles.summary}>{itemCount} items</Text>
          <Text style={styles.summaryDetail}>{totalUnits} total units</Text>

          <View style={styles.actions}>
            <TouchableOpacity
              testID={`${testID ?? 'modal'}-cancel`}
              style={styles.cancelButton}
              onPress={onCancel}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              testID={`${testID ?? 'modal'}-confirm`}
              style={[
                styles.confirmButton,
                { backgroundColor: typeConfig.color },
                isSubmitting && styles.disabledButton,
              ]}
              onPress={onConfirm}
              disabled={isSubmitting}
            >
              <Text style={styles.confirmText}>
                {isSubmitting ? 'Submitting...' : 'Confirm'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  typeBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 16,
  },
  typeLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  summary: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  summaryDetail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  confirmButton: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  disabledButton: {
    opacity: 0.6,
  },
})
