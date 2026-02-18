import React from 'react'
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native'
import { Search, X } from 'lucide-react-native'

export interface SearchInputProps {
  onChangeText: (text: string) => void
  value: string
  placeholder?: string
  onClear?: () => void
  testID?: string
}

export function SearchInput({
  onChangeText,
  value,
  placeholder = 'Search...',
  onClear,
  testID,
}: SearchInputProps) {
  const handleClear = () => {
    if (onClear) {
      onClear()
    } else {
      onChangeText('')
    }
  }

  return (
    <View style={styles.container}>
      <Search size={18} color="#9CA3AF" />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        onChangeText={onChangeText}
        value={value}
        testID={testID ? `${testID}-input` : 'search-input'}
      />
      {value.length > 0 ? (
        <TouchableOpacity
          onPress={handleClear}
          testID="search-clear"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <X size={18} color="#6B7280" />
        </TouchableOpacity>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    height: 44,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
    marginLeft: 8,
    padding: 0,
  },
})
