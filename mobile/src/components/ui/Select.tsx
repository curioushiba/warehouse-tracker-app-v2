import React, { useState } from 'react'
import { View, Text, Pressable, FlatList } from 'react-native'
import { ChevronDown } from 'lucide-react-native'
import { useTheme } from '@/theme'
import { AnimatedPressable } from '@/components/ui/AnimatedPressable'

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
  const { colors, spacing, radii, shadows, typography, zIndex: themeZIndex } = useTheme()
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
    <View style={{ width: '100%', position: 'relative' as const }}>
      <AnimatedPressable
        style={[
          {
            flexDirection: 'row' as const,
            alignItems: 'center' as const,
            justifyContent: 'space-between' as const,
            borderWidth: 1,
            borderColor: colors.borderPrimary,
            borderRadius: radii.md,
            backgroundColor: colors.surfacePrimary,
            paddingHorizontal: spacing[3],
            height: 44,
          },
          disabled ? { opacity: 0.5 } : null,
        ]}
        onPress={handlePress}
        testID={testID}
        disabled={disabled}
      >
        <Text style={{
          fontSize: typography.base.fontSize,
          lineHeight: typography.base.lineHeight,
          color: selectedOption ? colors.textPrimary : colors.textPlaceholder,
          flex: 1,
        }}>
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <ChevronDown size={16} color={colors.iconSecondary} />
      </AnimatedPressable>
      {isOpen && !disabled ? (
        <View
          style={{
            borderWidth: 1,
            borderColor: colors.borderPrimary,
            borderRadius: radii.md,
            backgroundColor: colors.surfaceElevated,
            marginTop: 4,
            maxHeight: 200,
            zIndex: themeZIndex.dropdown,
            ...shadows.md,
          }}
          testID={testID ? `${testID}-options` : 'select-options'}
        >
          <FlatList
            data={options}
            keyExtractor={(item) => item.value}
            renderItem={({ item }) => (
              <Pressable
                style={[
                  {
                    paddingHorizontal: spacing[3],
                    paddingVertical: spacing[2.5],
                  },
                  item.value === value ? { backgroundColor: colors.brandSecondary } : null,
                ]}
                onPress={() => handleSelect(item.value)}
              >
                <Text
                  style={[
                    { fontSize: typography.base.fontSize, lineHeight: typography.base.lineHeight, color: colors.textPrimary },
                    item.value === value ? { color: colors.brandPrimary, fontWeight: typography.weight.semibold } : null,
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            )}
          />
        </View>
      ) : null}
    </View>
  )
}
