import React, { useCallback, useState } from 'react';
import { View, Text, TextInput } from 'react-native';
import { Trash2, FileText } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeContext';
import { Card } from '@/components/ui/Card';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { StockLevelIndicator } from '@/components/indicators/StockLevelIndicator';
import { QuantityControl } from './QuantityControl';
import type { CartItem } from '@/lib/cart';

export interface CartItemRowProps {
  cartItem: CartItem;
  onUpdateQuantity: (itemId: string, qty: number) => void;
  onUpdateNotes: (itemId: string, notes: string) => void;
  onRemove: (itemId: string) => void;
}

export function CartItemRow({
  cartItem,
  onUpdateQuantity,
  onUpdateNotes,
  onRemove,
}: CartItemRowProps) {
  const { colors, spacing, typePresets, radii, fontFamily } = useTheme();
  const { item, quantity, notes } = cartItem;
  const [showNotes, setShowNotes] = useState(notes.length > 0);

  const handleQuantityChange = useCallback(
    (qty: number) => onUpdateQuantity(item.id, qty),
    [item.id, onUpdateQuantity],
  );

  const handleNotesChange = useCallback(
    (text: string) => onUpdateNotes(item.id, text),
    [item.id, onUpdateNotes],
  );

  const handleRemove = useCallback(
    () => onRemove(item.id),
    [item.id, onRemove],
  );

  return (
    <Card variant="elevated" style={{ gap: spacing[3] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
        <View style={{ flex: 1 }}>
          <Text
            style={{ ...typePresets.bodySmall, color: colors.text, fontWeight: '600' }}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          <Text style={{ ...typePresets.caption, color: colors.textSecondary }}>
            {item.sku} | {item.current_stock} {item.unit}
          </Text>
        </View>
        <StockLevelIndicator
          currentStock={item.current_stock}
          minStock={item.min_stock}
          maxStock={item.max_stock ?? undefined}
        />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <QuantityControl
          value={quantity}
          onChange={handleQuantityChange}
          decimals={item.quantity_decimals}
          unit={item.unit}
        />
        <View style={{ flexDirection: 'row', gap: spacing[2] }}>
          <AnimatedPressable
            onPress={() => setShowNotes((prev) => !prev)}
            hapticPattern="light"
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: showNotes ? colors.primaryLight : colors.surfaceSecondary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FileText size={16} color={showNotes ? colors.primary : colors.textTertiary} />
          </AnimatedPressable>
          <AnimatedPressable
            onPress={handleRemove}
            hapticPattern="medium"
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: colors.errorBackground,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Trash2 size={16} color={colors.error} />
          </AnimatedPressable>
        </View>
      </View>

      {showNotes && (
        <TextInput
          value={notes}
          onChangeText={handleNotesChange}
          placeholder="Add notes..."
          placeholderTextColor={colors.textTertiary}
          multiline
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radii.md,
            padding: spacing[2],
            minHeight: 60,
            color: colors.text,
            fontFamily: fontFamily.body,
            fontSize: typePresets.bodySmall.fontSize,
            textAlignVertical: 'top',
          }}
        />
      )}
    </Card>
  );
}
