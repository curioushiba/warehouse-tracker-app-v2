import React, { useMemo, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet } from 'react-native'
import { Search } from 'lucide-react-native'

export interface AutocompleteItem {
  id: string
  name: string
  sku: string
  barcode?: string
}

export interface ItemSearchAutocompleteProps {
  items: AutocompleteItem[]
  onSelect: (item: { id: string; name: string; sku: string }) => void
  placeholder?: string
  testID?: string
}

export function ItemSearchAutocomplete({
  items,
  onSelect,
  placeholder = 'Search items...',
  testID,
}: ItemSearchAutocompleteProps) {
  const [query, setQuery] = useState('')

  const filteredItems = useMemo(() => {
    if (!query.trim()) return []
    const lower = query.toLowerCase()
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(lower) ||
        item.sku.toLowerCase().includes(lower) ||
        (item.barcode && item.barcode.toLowerCase().includes(lower))
    )
  }, [query, items])

  const handleSelect = (item: AutocompleteItem) => {
    onSelect({ id: item.id, name: item.name, sku: item.sku })
    setQuery('')
  }

  const showDropdown = query.trim().length > 0

  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.inputRow}>
        <Search size={18} color="#9CA3AF" />
        <TextInput
          testID={`${testID ?? 'search'}-input`}
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          value={query}
          onChangeText={setQuery}
        />
      </View>
      {showDropdown && (
        <View style={styles.dropdown}>
          {filteredItems.length === 0 ? (
            <Text style={styles.noResults}>No results</Text>
          ) : (
            <FlatList
              data={filteredItems}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.resultRow}
                  onPress={() => handleSelect(item)}
                >
                  <Text style={styles.resultName}>{item.name}</Text>
                  <Text style={styles.resultSku}>{item.sku}</Text>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    zIndex: 10,
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
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
    padding: 0,
  },
  dropdown: {
    marginTop: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    maxHeight: 200,
    overflow: 'hidden',
  },
  noResults: {
    padding: 12,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  resultRow: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  resultName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  resultSku: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
})
