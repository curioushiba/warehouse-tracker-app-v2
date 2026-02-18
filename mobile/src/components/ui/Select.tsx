import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native'
import { ChevronDown } from 'lucide-react-native'

export interface SelectOption {
  label: string
  value: string
}

export interface SelectProps {
  placeholder?: string
  options: SelectOption[]
  value: string
  onValueChange: (value: string) => void
  disabled?: boolean
  testID?: string
}

export function Select({
  placeholder = 'Select...',
  options,
  value,
  onValueChange,
  disabled = false,
  testID,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false)

  const selectedOption = options.find((opt) => opt.value === value)

  const handlePress = () => {
    if (!disabled) {
      setIsOpen(!isOpen)
    }
  }

  const handleSelect = (optionValue: string) => {
    onValueChange(optionValue)
    setIsOpen(false)
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.trigger, disabled ? styles.triggerDisabled : null]}
        onPress={handlePress}
        testID={testID}
        activeOpacity={disabled ? 1 : 0.7}
      >
        <Text style={[styles.triggerText, !selectedOption ? styles.placeholderText : null]}>
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <ChevronDown size={16} color="#6B7280" />
      </TouchableOpacity>
      {isOpen && !disabled ? (
        <View style={styles.dropdown} testID={testID ? `${testID}-options` : 'select-options'}>
          <FlatList
            data={options}
            keyExtractor={(item) => item.value}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.option,
                  item.value === value ? styles.optionSelected : null,
                ]}
                onPress={() => handleSelect(item.value)}
              >
                <Text
                  style={[
                    styles.optionText,
                    item.value === value ? styles.optionTextSelected : null,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative',
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    height: 44,
  },
  triggerDisabled: {
    opacity: 0.5,
  },
  triggerText: {
    fontSize: 14,
    color: '#1F2937',
    flex: 1,
  },
  placeholderText: {
    color: '#9CA3AF',
  },
  dropdown: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    marginTop: 4,
    maxHeight: 200,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  option: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  optionSelected: {
    backgroundColor: '#F0FDF4',
  },
  optionText: {
    fontSize: 14,
    color: '#1F2937',
  },
  optionTextSelected: {
    color: '#01722f',
    fontWeight: '600',
  },
})
