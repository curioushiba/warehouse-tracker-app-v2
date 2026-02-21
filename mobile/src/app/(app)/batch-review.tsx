import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Trash2,
  RefreshCw,
  ClipboardList,
  ChevronLeft,
} from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeContext';
import { useSyncQueue } from '@/hooks/useSyncQueue';
import {
  getPendingTransactions,
  getCachedItem,
  removeTransaction,
} from '@/lib/db/operations';
import type { PendingTransaction } from '@/lib/db/types';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { EmptyState } from '@/components/ui/EmptyState';
import { haptic } from '@/lib/haptics';

export default function BatchReviewScreen() {
  const db = useSQLiteContext();
  const { colors, spacing, typePresets, radii } = useTheme();
  const { pendingCount, isSyncing, syncNow } = useSyncQueue();
  const [transactions, setTransactions] = useState<PendingTransaction[]>([]);

  const loadTransactions = useCallback(() => {
    try {
      const txs = getPendingTransactions(db);
      setTransactions(txs);
    } catch {
      // DB may not be ready
    }
  }, [db]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions, pendingCount]);

  const handleDelete = useCallback(
    (tx: PendingTransaction) => {
      const itemName = getCachedItem(db, tx.item_id)?.name ?? 'Unknown Item';

      Alert.alert(
        'Delete Transaction',
        `Remove ${tx.transaction_type === 'in' || tx.transaction_type === 'check_in' ? 'Stock In' : 'Stock Out'} x${tx.quantity} for "${itemName}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              haptic('warning');
              removeTransaction(db, tx.id);
              loadTransactions();
            },
          },
        ],
      );
    },
    [db, loadTransactions],
  );

  const handleSyncAll = useCallback(async () => {
    haptic('medium');
    await syncNow();
    loadTransactions();
  }, [syncNow, loadTransactions]);

  const getItemName = useCallback(
    (itemId: string): string => {
      const item = getCachedItem(db, itemId);
      return item?.name ?? 'Unknown Item';
    },
    [db],
  );

  const formatTime = (isoString: string): string =>
    new Date(isoString).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });

  const renderItem = useCallback(
    ({ item }: { item: PendingTransaction }) => {
      const isIn =
        item.transaction_type === 'in' ||
        item.transaction_type === 'check_in';
      const Icon = isIn ? ArrowDownToLine : ArrowUpFromLine;
      const iconColor = isIn ? colors.success : colors.error;

      return (
        <Card
          style={{
            marginHorizontal: spacing[4],
            marginBottom: spacing[2],
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing[3],
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: radii.md,
                backgroundColor: isIn
                  ? colors.successBackground
                  : colors.errorBackground,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon size={20} color={iconColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  ...typePresets.bodySmall,
                  color: colors.text,
                  fontWeight: '600',
                }}
                numberOfLines={1}
              >
                {getItemName(item.item_id)}
              </Text>
              <Text
                style={{
                  ...typePresets.caption,
                  color: colors.textSecondary,
                }}
              >
                {isIn ? 'Stock In' : 'Stock Out'} x{item.quantity}
                {' | '}
                {formatTime(item.device_timestamp)}
              </Text>
              {item.notes && (
                <Text
                  style={{
                    ...typePresets.caption,
                    color: colors.textTertiary,
                    marginTop: 2,
                  }}
                  numberOfLines={1}
                >
                  {item.notes}
                </Text>
              )}
            </View>
            <Badge
              label={item.status}
              variant={
                item.status === 'failed'
                  ? 'error'
                  : item.status === 'syncing'
                    ? 'info'
                    : 'default'
              }
            />
            <AnimatedPressable
              onPress={() => handleDelete(item)}
              hapticPattern="warning"
              style={{
                padding: spacing[2],
              }}
            >
              <Trash2 size={18} color={colors.error} />
            </AnimatedPressable>
          </View>
        </Card>
      );
    },
    [colors, spacing, radii, typePresets, getItemName, handleDelete],
  );

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={['top']}
    >
      <ScreenHeader
        title="Batch Review"
        rightAction={
          <AnimatedPressable
            onPress={() => router.back()}
            hapticPattern="light"
          >
            <Text
              style={{
                ...typePresets.bodySmall,
                color: colors.primary,
                fontWeight: '600',
              }}
            >
              Done
            </Text>
          </AnimatedPressable>
        }
      />

      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={
          <EmptyState
            icon={<ClipboardList size={48} color={colors.textTertiary} />}
            title="Queue Empty"
            message="All transactions have been synced."
            action={{
              label: 'Go Back',
              onPress: () => router.back(),
            }}
          />
        }
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: spacing[2],
          paddingBottom: spacing[4],
        }}
      />

      {transactions.length > 0 && (
        <View
          style={{
            padding: spacing[4],
            borderTopWidth: 1,
            borderTopColor: colors.border,
            backgroundColor: colors.surface,
          }}
        >
          <Button
            title={`Sync All (${transactions.length})`}
            onPress={handleSyncAll}
            loading={isSyncing}
            icon={<RefreshCw size={18} color={colors.textInverse} />}
            size="lg"
          />
        </View>
      )}
    </SafeAreaView>
  );
}
