import React from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeContext';
import { MODAL_SPRING } from '@/theme/animations';
import { Button } from '@/components/ui/Button';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { CartItemRow } from './CartItemRow';
import type { CartItem, CartState } from '@/lib/cart';
import { cartToArray, getCartItemCount, getCartTotalQuantity } from '@/lib/cart';
import type { TransactionType } from '@/lib/types';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.8;

export interface CartReviewSheetProps {
  visible: boolean;
  cart: CartState;
  transactionType: TransactionType;
  onChangeTransactionType: (type: TransactionType) => void;
  onUpdateQuantity: (itemId: string, qty: number) => void;
  onUpdateNotes: (itemId: string, notes: string) => void;
  onRemoveItem: (itemId: string) => void;
  onConfirm: () => void;
  onClose: () => void;
  submitting: boolean;
}

export function CartReviewSheet({
  visible,
  cart,
  transactionType,
  onChangeTransactionType,
  onUpdateQuantity,
  onUpdateNotes,
  onRemoveItem,
  onConfirm,
  onClose,
  submitting,
}: CartReviewSheetProps) {
  const { colors, spacing, radii, typePresets } = useTheme();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(SHEET_HEIGHT);

  React.useEffect(() => {
    translateY.value = withSpring(
      visible ? 0 : SHEET_HEIGHT,
      MODAL_SPRING,
      (finished) => {
        if (finished && !visible) {
          // Sheet fully hidden
        }
      },
    );
  }, [visible, translateY]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const items = cartToArray(cart);
  const itemCount = getCartItemCount(cart);
  const totalQty = getCartTotalQuantity(cart);

  const renderItem = React.useCallback(
    ({ item }: { item: CartItem }) => (
      <View style={{ paddingHorizontal: spacing[4], paddingVertical: spacing[1] }}>
        <CartItemRow
          cartItem={item}
          onUpdateQuantity={onUpdateQuantity}
          onUpdateNotes={onUpdateNotes}
          onRemove={onRemoveItem}
        />
      </View>
    ),
    [spacing, onUpdateQuantity, onUpdateNotes, onRemoveItem],
  );

  if (!visible) return null;

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 100,
      }}
    >
      {/* Backdrop */}
      <Pressable
        onPress={onClose}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
        }}
      />

      {/* Sheet */}
      <Animated.View
        style={[
          sheetStyle,
          {
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: SHEET_HEIGHT,
            backgroundColor: colors.background,
            borderTopLeftRadius: radii.xl,
            borderTopRightRadius: radii.xl,
          },
        ]}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Handle bar */}
          <View style={{ alignItems: 'center', paddingVertical: spacing[2] }}>
            <View
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                backgroundColor: colors.border,
              }}
            />
          </View>

          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: spacing[4],
              paddingBottom: spacing[3],
            }}
          >
            <View>
              <Text style={{ ...typePresets.title, color: colors.text }}>
                Review Batch
              </Text>
              <Text style={{ ...typePresets.caption, color: colors.textSecondary }}>
                {itemCount} item{itemCount !== 1 ? 's' : ''} | {totalQty} total qty
              </Text>
            </View>
            <AnimatedPressable onPress={onClose} hapticPattern="light">
              <X size={24} color={colors.textSecondary} />
            </AnimatedPressable>
          </View>

          {/* Cart items list */}
          <FlatList
            data={items}
            keyExtractor={(ci) => ci.item.id}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: spacing[4] }}
            keyboardShouldPersistTaps="handled"
          />

          {/* Confirm button */}
          <View
            style={{
              padding: spacing[4],
              paddingBottom: spacing[4] + insets.bottom,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              backgroundColor: colors.surface,
            }}
          >
            <Button
              title={`Confirm ${transactionType === 'check_in' ? 'Stock In' : 'Stock Out'} (${itemCount} items)`}
              onPress={onConfirm}
              loading={submitting}
              disabled={itemCount === 0}
              size="lg"
            />
          </View>
        </KeyboardAvoidingView>
      </Animated.View>
    </View>
  );
}
