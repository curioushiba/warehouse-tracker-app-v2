import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

type TransactionType = 'in' | 'out' | 'adjustment'

export interface TransactionTypeBadgeProps {
  type: TransactionType
  testID?: string
}

const TYPE_CONFIG: Record<TransactionType, { label: string; backgroundColor: string }> = {
  in: { label: 'CHECK IN', backgroundColor: '#16a34a' },
  out: { label: 'CHECK OUT', backgroundColor: '#dc2626' },
  adjustment: { label: 'ADJUSTMENT', backgroundColor: '#2563eb' },
}

export function TransactionTypeBadge({ type, testID }: TransactionTypeBadgeProps) {
  const config = TYPE_CONFIG[type]

  return (
    <View
      testID={testID}
      style={{ ...styles.badge, backgroundColor: config.backgroundColor }}
    >
      <Text style={styles.text}>{config.label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  text: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
})
