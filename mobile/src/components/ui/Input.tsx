import React from 'react'
import { View, TextInput, Text, StyleSheet } from 'react-native'

export interface InputProps {
  placeholder?: string
  onChangeText: (text: string) => void
  value: string
  error?: string
  leftIcon?: React.ReactNode
  disabled?: boolean
  secureTextEntry?: boolean
  testID?: string
}

export function Input({
  placeholder,
  onChangeText,
  value,
  error,
  leftIcon,
  disabled = false,
  secureTextEntry = false,
  testID,
}: InputProps) {
  return (
    <View style={styles.container}>
      <View style={[styles.inputRow, error ? styles.inputRowError : null]}>
        {leftIcon && <View style={styles.iconContainer}>{leftIcon}</View>}
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          onChangeText={onChangeText}
          value={value}
          editable={!disabled}
          secureTextEntry={secureTextEntry}
          testID={testID}
        />
      </View>
      {error ? (
        <Text style={styles.errorText} testID={testID ? `${testID}-error` : 'input-error'}>
          {error}
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    height: 44,
  },
  inputRowError: {
    borderColor: '#EF4444',
  },
  iconContainer: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
    padding: 0,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
})
