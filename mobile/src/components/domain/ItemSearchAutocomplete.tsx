import React, { useMemo, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, FlatList } from 'react-native'
import { Search } from 'lucide-react-native'
import Animated, { FadeIn } from 'react-native-reanimated'
import { useTheme } from '@/theme'

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

function HighlightedText({
  text,
  highlight,
  baseColor,
  highlightColor,
  fontWeight,
  highlightWeight,
  fontSize,
  lineHeight,
}: {
  text: string
  highlight: string
  baseColor: string
  highlightColor: string
  fontWeight: string
  highlightWeight: string
  fontSize: number
  lineHeight: number
}) {
  if (!highlight.trim()) {
    return (
      <Text style={{ color: baseColor, fontWeight: fontWeight as any, fontSize, lineHeight }}>
        {text}
      </Text>
    )
  }

  const lowerText = text.toLowerCase()
  const lowerHighlight = highlight.toLowerCase()
  const startIndex = lowerText.indexOf(lowerHighlight)

  if (startIndex === -1) {
    return (
      <Text style={{ color: baseColor, fontWeight: fontWeight as any, fontSize, lineHeight }}>
        {text}
      </Text>
    )
  }

  const before = text.slice(0, startIndex)
  const match = text.slice(startIndex, startIndex + highlight.length)
  const after = text.slice(startIndex + highlight.length)

  return (
    <Text style={{ fontSize, lineHeight }}>
      <Text style={{ color: baseColor, fontWeight: fontWeight as any }}>{before}</Text>
      <Text style={{ color: highlightColor, fontWeight: highlightWeight as any }}>{match}</Text>
      <Text style={{ color: baseColor, fontWeight: fontWeight as any }}>{after}</Text>
    </Text>
  )
}

export function ItemSearchAutocomplete({
  items,
  onSelect,
  placeholder = 'Search items...',
  testID,
}: ItemSearchAutocompleteProps) {
  const [query, setQuery] = useState('')
  const { colors, spacing, typography, radii } = useTheme()

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
    <View style={{ width: '100%', zIndex: 10 }} testID={testID}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: colors.borderPrimary,
          borderRadius: radii.md,
          backgroundColor: colors.surfacePrimary,
          paddingHorizontal: spacing[3],
          height: 44,
          gap: spacing[2],
        }}
      >
        <Search size={18} color={colors.iconSecondary} />
        <TextInput
          testID={`${testID ?? 'search'}-input`}
          style={{
            flex: 1,
            fontSize: typography.base.fontSize,
            color: colors.textPrimary,
            padding: 0,
          }}
          placeholder={placeholder}
          placeholderTextColor={colors.textPlaceholder}
          value={query}
          onChangeText={setQuery}
        />
      </View>
      {showDropdown && (
        <Animated.View
          entering={FadeIn.duration(150)}
          style={{
            marginTop: spacing[1],
            backgroundColor: colors.surfaceElevated,
            borderWidth: 1,
            borderColor: colors.borderSubtle,
            borderRadius: radii.md,
            maxHeight: 200,
            overflow: 'hidden',
          }}
        >
          {filteredItems.length === 0 ? (
            <Text
              style={{
                padding: spacing[3],
                fontSize: typography.base.fontSize,
                lineHeight: typography.base.lineHeight,
                color: colors.textSecondary,
                textAlign: 'center',
              }}
            >
              No results
            </Text>
          ) : (
            <FlatList
              data={filteredItems}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={{
                    paddingVertical: spacing[2.5],
                    paddingHorizontal: spacing[3],
                    borderBottomWidth: 1,
                    borderBottomColor: colors.bgTertiary,
                  }}
                  onPress={() => handleSelect(item)}
                >
                  <HighlightedText
                    text={item.name}
                    highlight={query}
                    baseColor={colors.textPrimary}
                    highlightColor={colors.brandPrimary}
                    fontWeight={typography.weight.semibold}
                    highlightWeight={typography.weight.bold}
                    fontSize={typography.base.fontSize}
                    lineHeight={typography.base.lineHeight}
                  />
                  <Text
                    style={{
                      fontSize: typography.sm.fontSize,
                      lineHeight: typography.sm.lineHeight,
                      color: colors.textSecondary,
                      marginTop: spacing[0.5],
                    }}
                  >
                    {item.sku}
                  </Text>
                </TouchableOpacity>
              )}
            />
          )}
        </Animated.View>
      )}
    </View>
  )
}
