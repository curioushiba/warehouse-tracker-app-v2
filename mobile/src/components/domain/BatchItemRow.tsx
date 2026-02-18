import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Plus, Minus, Trash2 } from 'lucide-react-native'
import { clampQuantity } from '@/lib/constants'

export interface BatchItemRowItem {
  id: string
  name: string
  quantity: number
  unit?: string
  currentStock?: number
}

export interface BatchItemRowProps {
  item: BatchItemRowItem
  onQuantityChange: (id: string, quantity: number) => void
  onRemove: (id: string) => void
  showStockError?: boolean
  testID?: string
}

export function BatchItemRow({
  item,
  onQuantityChange,
  onRemove,
  showStockError = false,
  testID,
}: BatchItemRowProps) {
  const handlePlus = () => {
    onQuantityChange(item.id, clampQuantity(item.quantity + 1))
  }

  const handleMinus = () => {
    onQuantityChange(item.id, clampQuantity(item.quantity - 1))
  }

  const quantityDisplay = item.unit
    ? `${item.quantity} ${item.unit}`
    : `${item.quantity}`

  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.topRow}>
        <Text style={styles.name} numberOfLines={1}>
          {item.name}
        </Text>
        <TouchableOpacity
          testID={`${testID ?? 'row'}-remove`}
          onPress={() => onRemove(item.id)}
          style={styles.removeButton}
        >
          <Trash2 size={18} color="#EF4444" />
        </TouchableOpacity>
      </View>
      <View style={styles.bottomRow}>
        <View style={styles.stepper}>
          <TouchableOpacity
            testID={`${testID ?? 'row'}-minus`}
            style={styles.stepButton}
            onPress={handleMinus}
          >
            <Minus size={16} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.quantity}>{quantityDisplay}</Text>
          <TouchableOpacity
            testID={`${testID ?? 'row'}-plus`}
            style={styles.stepButton}
            onPress={handlePlus}
          >
            <Plus size={16} color="#374151" />
          </TouchableOpacity>
        </View>
      </View>
      {showStockError && (
        <Text style={styles.error}>Exceeds stock</Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
    marginRight: 8,
  },
  removeButton: {
    padding: 4,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    overflow: 'hidden',
  },
  stepButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  quantity: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    minWidth: 48,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  error: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
})
