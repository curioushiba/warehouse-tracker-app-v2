import React from 'react'
import { View, Text, Switch as RNSwitch, StyleSheet } from 'react-native'

export interface SwitchProps {
  value: boolean
  onValueChange: (value: boolean) => void
  label?: string
  disabled?: boolean
  testID?: string
}

export function Switch({
  value,
  onValueChange,
  label,
  disabled = false,
  testID,
}: SwitchProps) {
  return (
    <View style={styles.container}>
      {label ? (
        <Text style={styles.label} testID={testID ? `${testID}-label` : 'switch-label'}>
          {label}
        </Text>
      ) : null}
      <RNSwitch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        testID={testID}
        trackColor={{ false: '#D1D5DB', true: '#86EFAC' }}
        thumbColor={value ? '#01722f' : '#F3F4F6'}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 14,
    color: '#1F2937',
    flex: 1,
    marginRight: 12,
  },
})
