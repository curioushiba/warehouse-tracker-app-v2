import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  InteractionManager,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import { randomUUID } from 'expo-crypto';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Package,
  ChevronLeft,
} from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeContext';
import { useSyncQueue } from '@/hooks/useSyncQueue';
import { getCachedItem, enqueueTransaction } from '@/lib/db/operations';
import type { CachedItem, PendingTransaction } from '@/lib/db/types';
import type { TransactionType } from '@/lib/types';
import { screenColors } from '@/theme/tokens';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { StockLevelIndicator } from '@/components/indicators/StockLevelIndicator';
import { haptic } from '@/lib/haptics';

export default function TransactionScreen() {
  const db = useSQLiteContext();
  const { id, type: initialType } = useLocalSearchParams<{
    id: string;
    type?: string;
  }>();
  const { colors, spacing, typePresets, radii } = useTheme();
  const { syncNow } = useSyncQueue();
  const [item, setItem] = useState<CachedItem | null>(null);
  const [transactionType, setTransactionType] = useState<TransactionType>(
    initialType === 'check_out' ? 'check_out' : 'check_in',
  );
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      const interaction = InteractionManager.runAfterInteractions(() => {
        const cached = getCachedItem(db, id);
        setItem(cached);
      });
      return () => interaction.cancel();
    }
  }, [db, id]);

  const handleSubmit = useCallback(async () => {
    if (!item) return;

    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Invalid Quantity', 'Please enter a valid quantity greater than 0.');
      return;
    }

    if (qty > 9999.999) {
      Alert.alert('Invalid Quantity', 'Quantity cannot exceed 9999.999.');
      return;
    }

    const parts = quantity.split('.');
    if (parts.length > 1 && parts[1].length > item.quantity_decimals) {
      Alert.alert(
        'Invalid Quantity',
        `This item allows up to ${item.quantity_decimals} decimal place(s).`,
      );
      return;
    }

    setSubmitting(true);
    haptic('medium');

    try {
      const now = new Date().toISOString();
      const tx: PendingTransaction = {
        id: randomUUID(),
        item_id: item.id,
        transaction_type: transactionType,
        quantity: qty,
        notes: notes.trim() || null,
        device_timestamp: now,
        created_at: now,
        status: 'pending',
      };

      enqueueTransaction(db, tx);
      haptic('success');

      void syncNow();

      router.back();
    } catch {
      haptic('error');
      Alert.alert('Error', 'Failed to save transaction. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [item, quantity, notes, transactionType, db, syncNow]);

  if (!item) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: screenColors.transaction }}
        edges={['top']}
      >
        <ScreenHeader
          title="Transaction"
          headerColor={screenColors.transaction}
          rightAction={
            <AnimatedPressable
              onPress={() => router.back()}
              hapticPattern="light"
            >
              <ChevronLeft size={24} color="#fff" />
            </AnimatedPressable>
          }
        />
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.background,
          }}
        >
          <Text
            style={{ ...typePresets.body, color: colors.textSecondary }}
          >
            Item not found
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: screenColors.transaction }}
      edges={['top']}
    >
      <ScreenHeader
        title="New Transaction"
        headerColor={screenColors.transaction}
        rightAction={
          <AnimatedPressable
            onPress={() => router.back()}
            hapticPattern="light"
          >
            <Text
              style={{
                ...typePresets.bodySmall,
                color: '#fff',
                fontWeight: '600',
              }}
            >
              Cancel
            </Text>
          </AnimatedPressable>
        }
      />

      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.background }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={{
            padding: spacing[4],
            gap: spacing[4],
          }}
          keyboardShouldPersistTaps="handled"
        >
          <Card variant="elevated">
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing[3],
              }}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: radii.md,
                  backgroundColor: colors.primaryLight,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Package size={24} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    ...typePresets.title,
                    color: colors.text,
                  }}
                  numberOfLines={2}
                >
                  {item.name}
                </Text>
                <Text
                  style={{
                    ...typePresets.bodySmall,
                    color: colors.textSecondary,
                    marginTop: spacing[1],
                  }}
                >
                  SKU: {item.sku}
                </Text>
              </View>
            </View>

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: spacing[3],
                paddingTop: spacing[3],
                borderTopWidth: 1,
                borderTopColor: colors.borderSubtle,
              }}
            >
              <View>
                <Text
                  style={{
                    ...typePresets.caption,
                    color: colors.textSecondary,
                  }}
                >
                  Current Stock
                </Text>
                <Text
                  style={{
                    ...typePresets.heading,
                    color: colors.text,
                  }}
                >
                  {item.current_stock} {item.unit}
                </Text>
              </View>
              <StockLevelIndicator
                currentStock={item.current_stock}
                minStock={item.min_stock}
                maxStock={item.max_stock ?? undefined}
              />
            </View>
          </Card>

          <View>
            <Text
              style={{
                ...typePresets.label,
                color: colors.text,
                marginBottom: spacing[2],
              }}
            >
              Transaction Type
            </Text>
            <View
              style={{
                flexDirection: 'row',
                gap: spacing[2],
              }}
            >
              <AnimatedPressable
                onPress={() => setTransactionType('check_in')}
                hapticPattern="light"
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: spacing[2],
                  paddingVertical: spacing[3],
                  borderRadius: radii.md,
                  backgroundColor:
                    transactionType === 'check_in'
                      ? colors.successBackground
                      : colors.surfaceSecondary,
                  borderWidth: transactionType === 'check_in' ? 2 : 1,
                  borderColor:
                    transactionType === 'check_in'
                      ? colors.success
                      : colors.border,
                }}
              >
                <ArrowDownToLine
                  size={20}
                  color={
                    transactionType === 'check_in'
                      ? colors.success
                      : colors.textSecondary
                  }
                />
                <Text
                  style={{
                    ...typePresets.label,
                    color:
                      transactionType === 'check_in'
                        ? colors.success
                        : colors.textSecondary,
                  }}
                >
                  Stock In
                </Text>
              </AnimatedPressable>

              <AnimatedPressable
                onPress={() => setTransactionType('check_out')}
                hapticPattern="light"
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: spacing[2],
                  paddingVertical: spacing[3],
                  borderRadius: radii.md,
                  backgroundColor:
                    transactionType === 'check_out'
                      ? colors.errorBackground
                      : colors.surfaceSecondary,
                  borderWidth: transactionType === 'check_out' ? 2 : 1,
                  borderColor:
                    transactionType === 'check_out'
                      ? colors.error
                      : colors.border,
                }}
              >
                <ArrowUpFromLine
                  size={20}
                  color={
                    transactionType === 'check_out'
                      ? colors.error
                      : colors.textSecondary
                  }
                />
                <Text
                  style={{
                    ...typePresets.label,
                    color:
                      transactionType === 'check_out'
                        ? colors.error
                        : colors.textSecondary,
                  }}
                >
                  Stock Out
                </Text>
              </AnimatedPressable>
            </View>
          </View>

          <Input
            label="Quantity"
            value={quantity}
            onChangeText={setQuantity}
            placeholder={`Enter quantity (${item.unit})`}
            keyboardType="decimal-pad"
          />

          <Input
            label="Notes (optional)"
            value={notes}
            onChangeText={setNotes}
            placeholder="Add any notes..."
            multiline
          />
        </ScrollView>

        <View
          style={{
            padding: spacing[4],
            borderTopWidth: 1,
            borderTopColor: colors.border,
            backgroundColor: colors.surface,
          }}
        >
          <Button
            title={`${transactionType === 'check_in' ? 'Stock In' : 'Stock Out'}${quantity ? ` x${quantity}` : ''}`}
            onPress={handleSubmit}
            loading={submitting}
            disabled={!quantity || parseFloat(quantity) <= 0}
            size="lg"
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
