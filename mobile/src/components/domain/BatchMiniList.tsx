import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

export interface BatchMiniListItem {
  id: string
  name: string
  quantity: number
}

export interface BatchMiniListProps {
  items: BatchMiniListItem[]
  maxVisibleItems?: number
  testID?: string
}

export function BatchMiniList({
  items,
  maxVisibleItems = 4,
  testID,
}: BatchMiniListProps) {
  const visibleItems = items.slice(0, maxVisibleItems)
  const overflowCount = items.length - maxVisibleItems

  return (
    <View style={styles.container} testID={testID}>
      <Text style={styles.header}>
        {items.length === 0
          ? 'No items added'
          : `${items.length} ${items.length === 1 ? 'item' : 'items'}`}
      </Text>
      {visibleItems.map((item) => (
        <View key={item.id} style={styles.row}>
          <Text style={styles.itemName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.itemQuantity}>{item.quantity}</Text>
        </View>
      ))}
      {overflowCount > 0 && (
        <Text style={styles.overflow}>+{overflowCount} more</Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
  },
  header: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  itemName: {
    fontSize: 14,
    color: '#1F2937',
    flex: 1,
    marginRight: 8,
  },
  itemQuantity: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  overflow: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    fontStyle: 'italic',
  },
})
