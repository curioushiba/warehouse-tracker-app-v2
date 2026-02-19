import React, { useState } from 'react'
import { View, TextInput } from 'react-native'
import { Search, X } from 'lucide-react-native'
import { useTheme } from '@/theme'
import { AnimatedPressable } from '@/components/ui/AnimatedPressable'

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
  const { colors, spacing, radii, typography } = useTheme()
  const [isFocused, setIsFocused] = useState(false)

  const handleClear = () => {
    if (onClear) {
      onClear()
    } else {
      onChangeText('')
    }
  }

  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: isFocused ? colors.borderFocus : colors.borderPrimary,
      borderRadius: radii.md,
      backgroundColor: colors.surfacePrimary,
      paddingHorizontal: spacing[3],
      height: 44,
    }}>
      <Search size={18} color={colors.iconSecondary} />
      <TextInput
        style={{
          flex: 1,
          fontSize: typography.base.fontSize,
          lineHeight: typography.base.lineHeight,
          color: colors.textPrimary,
          marginLeft: spacing[2],
          padding: 0,
        }}
        placeholder={placeholder}
        placeholderTextColor={colors.textPlaceholder}
        onChangeText={onChangeText}
        value={value}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        testID={testID ? `${testID}-input` : 'search-input'}
      />
      {value.length > 0 ? (
        <AnimatedPressable
          onPress={handleClear}
          testID="search-clear"
        >
          <View style={{ padding: 8 }}>
            <X size={18} color={colors.iconSecondary} />
          </View>
        </AnimatedPressable>
      ) : null}
    </View>
  )
}
