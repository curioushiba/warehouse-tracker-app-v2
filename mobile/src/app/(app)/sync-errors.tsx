import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import {
  AlertCircle,
  RefreshCw,
  Trash2,
  ShieldAlert,
} from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSyncQueue } from '@/hooks/useSyncQueue';
import {
  getPendingTransactions,
  getCachedItem,
  removeTransaction,
  updateTransactionStatus,
} from '@/lib/db/operations';
import type { PendingTransaction } from '@/lib/db/types';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { EmptyState } from '@/components/ui/EmptyState';
import { haptic } from '@/lib/haptics';

export default function SyncErrorsScreen() {
  const db = useSQLiteContext();
  const { colors, spacing, typePresets, radii } = useTheme();
  const { profile } = useAuth();
  const { isSyncing, syncNow } = useSyncQueue();
  const [failedTransactions, setFailedTransactions] = useState<
    PendingTransaction[]
  >([]);

  const loadFailed = useCallback(() => {
    try {
      const all = getPendingTransactions(db);
      setFailedTransactions(all.filter((tx) => tx.status === 'failed'));
    } catch {
      // DB may not be ready
    }
  }, [db]);

  useEffect(() => {
    loadFailed();
  }, [loadFailed]);

  // Restrict to admin
  if (profile?.role !== 'admin') {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: colors.background }}
        edges={['top']}
      >
        <ScreenHeader title="Sync Errors" />
        <EmptyState
          icon={<ShieldAlert size={48} color={colors.textTertiary} />}
          title="Access Denied"
          message="Only administrators can view sync errors."
          action={{
            label: 'Go Back',
            onPress: () => router.back(),
          }}
        />
      </SafeAreaView>
    );
  }

  const handleRetry = useCallback(
    (tx: PendingTransaction) => {
      haptic('medium');
      updateTransactionStatus(db, tx.id, 'pending');
      loadFailed();
      void syncNow();
    },
    [db, loadFailed, syncNow],
  );

  const handleDelete = useCallback(
    (tx: PendingTransaction) => {
      const itemName =
        getCachedItem(db, tx.item_id)?.name ?? 'Unknown Item';

      Alert.alert(
        'Delete Failed Transaction',
        `Permanently remove the failed transaction for "${itemName}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              haptic('warning');
              removeTransaction(db, tx.id);
              loadFailed();
            },
          },
        ],
      );
    },
    [db, loadFailed],
  );

  const handleRetryAll = useCallback(async () => {
    haptic('medium');
    for (const tx of failedTransactions) {
      updateTransactionStatus(db, tx.id, 'pending');
    }
    loadFailed();
    await syncNow();
    loadFailed();
  }, [db, failedTransactions, loadFailed, syncNow]);

  const getItemName = useCallback(
    (itemId: string): string => {
      const item = getCachedItem(db, itemId);
      return item?.name ?? 'Unknown Item';
    },
    [db],
  );

  const renderItem = useCallback(
    ({ item }: { item: PendingTransaction }) => {
      const isIn =
        item.transaction_type === 'in' ||
        item.transaction_type === 'check_in';

      return (
        <Card
          style={{
            marginHorizontal: spacing[4],
            marginBottom: spacing[2],
          }}
        >
          <View style={{ gap: spacing[2] }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing[3],
              }}
            >
              <AlertCircle size={20} color={colors.error} />
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
                </Text>
              </View>
              <Badge label="Failed" variant="error" />
            </View>

            <View
              style={{
                flexDirection: 'row',
                gap: spacing[2],
                justifyContent: 'flex-end',
              }}
            >
              <Button
                title="Retry"
                onPress={() => handleRetry(item)}
                variant="primary"
                size="sm"
                icon={<RefreshCw size={14} color={colors.textInverse} />}
              />
              <AnimatedPressable
                onPress={() => handleDelete(item)}
                hapticPattern="warning"
                style={{
                  padding: spacing[2],
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Trash2 size={18} color={colors.error} />
              </AnimatedPressable>
            </View>
          </View>
        </Card>
      );
    },
    [colors, spacing, typePresets, getItemName, handleRetry, handleDelete],
  );

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={['top']}
    >
      <ScreenHeader
        title="Sync Errors"
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
        data={failedTransactions}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={
          <EmptyState
            icon={<AlertCircle size={48} color={colors.success} />}
            title="No Sync Errors"
            message="All transactions have been processed successfully."
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

      {failedTransactions.length > 0 && (
        <View
          style={{
            padding: spacing[4],
            borderTopWidth: 1,
            borderTopColor: colors.border,
            backgroundColor: colors.surface,
          }}
        >
          <Button
            title={`Retry All (${failedTransactions.length})`}
            onPress={handleRetryAll}
            loading={isSyncing}
            icon={<RefreshCw size={18} color={colors.textInverse} />}
            size="lg"
          />
        </View>
      )}
    </SafeAreaView>
  );
}
