import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, Alert, InteractionManager } from 'react-native';
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
  getCachedItemNames,
  removeTransaction,
} from '@/lib/db/operations';
import type { PendingTransaction } from '@/lib/db/types';
import { screenColors } from '@/theme/tokens';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { EmptyState } from '@/components/ui/EmptyState';
import { isStockInType } from '@/lib/types';
import { haptic } from '@/lib/haptics';

function pendingBadgeVariant(status: PendingTransaction['status']) {
  switch (status) {
    case 'failed':
      return 'error' as const;
    case 'syncing':
      return 'info' as const;
    default:
      return 'default' as const;
  }
}

export default function BatchReviewScreen() {
  const db = useSQLiteContext();
  const { colors, spacing, typePresets, radii } = useTheme();
  const { pendingCount, isSyncing, syncNow } = useSyncQueue();
  const [transactions, setTransactions] = useState<PendingTransaction[]>([]);
  const [itemNames, setItemNames] = useState<Map<string, string>>(new Map());

  const loadTransactions = useCallback(() => {
    try {
      const txs = getPendingTransactions(db);
      setTransactions(txs);
      const ids = [...new Set(txs.map(tx => tx.item_id))];
      setItemNames(getCachedItemNames(db, ids));
    } catch {
      // DB may not be ready
    }
  }, [db]);

  useEffect(() => {
    const interaction = InteractionManager.runAfterInteractions(() => {
      loadTransactions();
    });
    return () => interaction.cancel();
  }, [loadTransactions, pendingCount]);

  const handleDelete = useCallback(
    (tx: PendingTransaction) => {
      const itemName = getCachedItem(db, tx.item_id)?.name ?? 'Unknown Item';

      Alert.alert(
        'Delete Transaction',
        `Remove ${isStockInType(tx.transaction_type) ? 'Stock In' : 'Stock Out'} x${tx.quantity} for "${itemName}"?`,
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

  function formatTime(isoString: string): string {
    return new Date(isoString).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  const renderItem = useCallback(
    ({ item }: { item: PendingTransaction }) => {
      const isIn = isStockInType(item.transaction_type);
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
                {itemNames.get(item.item_id) ?? 'Unknown Item'}
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
            <Badge label={item.status} variant={pendingBadgeVariant(item.status)} />
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
    [colors, spacing, radii, typePresets, itemNames, handleDelete],
  );

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: screenColors.batchReview }}
      edges={['top']}
    >
      <ScreenHeader
        title="Batch Review"
        headerColor={screenColors.batchReview}
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
              Done
            </Text>
          </AnimatedPressable>
        }
      />

      <View style={{ flex: 1, backgroundColor: colors.background }}>
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
      </View>
    </SafeAreaView>
  );
}
