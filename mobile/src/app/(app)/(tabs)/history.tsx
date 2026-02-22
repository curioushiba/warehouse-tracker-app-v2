import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  RefreshCw,
  ClipboardList,
} from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSyncQueue } from '@/hooks/useSyncQueue';
import { getPendingTransactions, getCachedItem } from '@/lib/db/operations';
import { isStockInType } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { fetchRecentTransactions } from '@/lib/sync';
import {
  mergeTransactions,
  transactionBadgeVariant,
  transactionBadgeLabel,
  type UnifiedTransaction,
} from '@/lib/transactions';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) return 'Today';
  if (isYesterday) return 'Yesterday';

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface GroupedTransactions {
  date: string;
  transactions: UnifiedTransaction[];
}

function groupByDate(transactions: UnifiedTransaction[]): GroupedTransactions[] {
  const groups = new Map<string, UnifiedTransaction[]>();

  for (const tx of transactions) {
    const dateKey = formatDate(tx.timestamp);
    const existing = groups.get(dateKey);
    if (existing) {
      existing.push(tx);
    } else {
      groups.set(dateKey, [tx]);
    }
  }

  return Array.from(groups, ([date, txs]) => ({
    date,
    transactions: txs,
  }));
}

export default function HistoryScreen() {
  const db = useSQLiteContext();
  const { colors, spacing, typePresets, radii } = useTheme();
  const { user } = useAuth();
  const { pendingCount, isSyncing, syncNow } = useSyncQueue();
  const [transactions, setTransactions] = useState<UnifiedTransaction[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadTransactions = useCallback(async () => {
    try {
      const localTxs = getPendingTransactions(db);

      let completed: Awaited<ReturnType<typeof fetchRecentTransactions>> = [];
      if (user?.id && supabase) {
        completed = await fetchRecentTransactions(supabase, user.id);
      }

      setTransactions(mergeTransactions(localTxs, completed));
    } catch {
      // DB may not be ready
    }
  }, [db, user?.id]);

  useEffect(() => {
    void loadTransactions();
  }, [loadTransactions, pendingCount]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await syncNow();
    await loadTransactions();
    setRefreshing(false);
  }, [syncNow, loadTransactions]);

  const getItemName = useCallback(
    (itemId: string): string => {
      const item = getCachedItem(db, itemId);
      return item?.name ?? 'Unknown Item';
    },
    [db],
  );

  const grouped = groupByDate(transactions);

  const renderItem = useCallback(
    ({ item }: { item: GroupedTransactions }) => (
      <View style={{ marginBottom: spacing[3] }}>
        <View
          style={{
            paddingHorizontal: spacing[4],
            paddingVertical: spacing[2],
          }}
        >
          <Text
            style={{
              ...typePresets.label,
              color: colors.textSecondary,
            }}
          >
            {item.date}
          </Text>
        </View>

        {item.transactions.map((tx) => {
          const isIn = isStockInType(tx.transaction_type);
          const Icon = isIn ? ArrowDownToLine : ArrowUpFromLine;
          const iconColor = isIn ? colors.success : colors.error;

          return (
            <Card
              key={tx.id}
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
                    {getItemName(tx.item_id)}
                  </Text>
                  <Text
                    style={{
                      ...typePresets.caption,
                      color: colors.textSecondary,
                    }}
                  >
                    {isIn ? 'Stock In' : 'Stock Out'} x{tx.quantity}
                    {' | '}
                    {formatTime(tx.timestamp)}
                  </Text>
                </View>
                <Badge
                  label={transactionBadgeLabel(tx.status)}
                  variant={transactionBadgeVariant(tx.status)}
                />
              </View>
            </Card>
          );
        })}
      </View>
    ),
    [colors, spacing, radii, typePresets, getItemName],
  );

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={['top']}
    >
      <ScreenHeader
        title="History"
        rightAction={
          isSyncing ? (
            <RefreshCw size={20} color={colors.primary} />
          ) : undefined
        }
      />

      <FlatList
        data={grouped}
        keyExtractor={(item) => item.date}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon={<ClipboardList size={48} color={colors.textTertiary} />}
            title="No Transactions"
            message="Your transaction history will appear here once you start recording stock movements."
          />
        }
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: spacing[4],
        }}
      />
    </SafeAreaView>
  );
}
