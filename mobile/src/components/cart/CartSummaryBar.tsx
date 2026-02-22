import React from 'react';
import { View, Text } from 'react-native';
import { ShoppingBag } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeContext';
import { Button } from '@/components/ui/Button';

export interface CartSummaryBarProps {
  itemCount: number;
  totalQuantity: number;
  onReview: () => void;
  onClear: () => void;
}

export function CartSummaryBar({
  itemCount,
  totalQuantity,
  onReview,
  onClear,
}: CartSummaryBarProps) {
  const { colors, spacing, typePresets } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing[3],
        paddingBottom: spacing[3] + insets.bottom,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: colors.surface,
        gap: spacing[3],
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], flex: 1 }}>
        <ShoppingBag size={20} color={colors.primary} />
        <Text style={{ ...typePresets.bodySmall, color: colors.text, fontWeight: '600' }}>
          {itemCount} item{itemCount !== 1 ? 's' : ''}
        </Text>
        <Text style={{ ...typePresets.caption, color: colors.textSecondary }}>
          ({totalQuantity} qty)
        </Text>
      </View>
      <Button title="Clear" onPress={onClear} variant="ghost" size="sm" />
      <Button title="Review" onPress={onReview} variant="primary" size="sm" />
    </View>
  );
}
