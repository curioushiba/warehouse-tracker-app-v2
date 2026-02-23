import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { View, Text, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  SlidersHorizontal,
  ClipboardList,
  Search,
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
  formatQuantityDelta,
  type UnifiedTransaction,
} from '@/lib/transactions';
import { screenColors } from '@/theme/tokens';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { EmptyState } from '@/components/ui/EmptyState';


function formatDate(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) return 'TODAY';

  const month = date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const day = date.getDate();

  if (isYesterday) return `YESTERDAY, ${month} ${day}`;

  const weekday = date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
  const yearSuffix = date.getFullYear() !== now.getFullYear() ? ` ${date.getFullYear()}` : '';
  return `${weekday}, ${month} ${day}${yearSuffix}`;
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
  const [searchQuery, setSearchQuery] = useState('');
  const [itemLookup, setItemLookup] = useState<Map<string, { name: string; sku: string }>>(
    new Map(),
  );

  const loadTransactions = useCallback(async () => {
    try {
      const localTxs = getPendingTransactions(db);

      let completed: Awaited<ReturnType<typeof fetchRecentTransactions>> = [];
      if (user?.id && supabase) {
        completed = await fetchRecentTransactions(supabase, user.id);
      }

      const merged = mergeTransactions(localTxs, completed);
      setTransactions(merged);

      // Build item lookup from unique item IDs
      const lookup = new Map<string, { name: string; sku: string }>();
      const seenIds = new Set<string>();
      for (const tx of merged) {
        if (seenIds.has(tx.item_id)) continue;
        seenIds.add(tx.item_id);
        const cached = getCachedItem(db, tx.item_id);
        if (cached) {
          lookup.set(tx.item_id, { name: cached.name, sku: cached.sku });
        }
      }
      setItemLookup(lookup);
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

  const filteredTransactions = useMemo(() => {
    if (!searchQuery.trim()) return transactions;
    const q = searchQuery.trim().toLowerCase();
    return transactions.filter((tx) => {
      const item = itemLookup.get(tx.item_id);
      return item?.name.toLowerCase().includes(q) || item?.sku.toLowerCase().includes(q);
    });
  }, [transactions, searchQuery, itemLookup]);

  const grouped = groupByDate(filteredTransactions);

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
              ...typePresets.caption,
              fontWeight: '600',
              letterSpacing: 0.5,
              color: colors.textTertiary,
            }}
          >
            {item.date}
          </Text>
        </View>

        {item.transactions.map((tx) => {
          const isIn = isStockInType(tx.transaction_type);
          const Icon = isIn ? ArrowDownToLine : ArrowUpFromLine;
          const iconColor = isIn ? colors.success : colors.error;
          const deltaColor = isIn ? colors.success : colors.error;
          const itemInfo = itemLookup.get(tx.item_id);
          const itemName = itemInfo?.name ?? 'Unknown Item';
          const itemSku = itemInfo?.sku ?? '';

          const statusSuffix =
            tx.status === 'failed'
              ? ' \u00B7 Failed'
              : tx.status === 'syncing'
                ? ' \u00B7 Syncing'
                : '';

          return (
            <Card
              key={tx.id}
              variant="elevated"
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
                    borderRadius: radii.full,
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
                    {itemName}
                  </Text>
                  <Text
                    style={{
                      ...typePresets.caption,
                      color: colors.textSecondary,
                    }}
                    numberOfLines={1}
                  >
                    {itemSku} {'\u00B7'} {formatTime(tx.timestamp)}
                    {statusSuffix && (
                      <Text style={{ color: colors.error }}>{statusSuffix}</Text>
                    )}
                  </Text>
                </View>
                <Text
                  style={{
                    ...typePresets.bodySmall,
                    fontWeight: '700',
                    color: deltaColor,
                  }}
                >
                  {formatQuantityDelta(tx.quantity, tx.transaction_type)}
                </Text>
              </View>
            </Card>
          );
        })}
      </View>
    ),
    [colors, spacing, radii, typePresets, itemLookup],
  );

  const isSearchActive = searchQuery.trim().length > 0;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: screenColors.history }}
      edges={['top']}
    >
      <ScreenHeader
        title="History"
        headerColor={screenColors.history}
        rightAction={
          <AnimatedPressable
            onPress={() => {
              /* future filter sheet */
            }}
            hapticPattern="light"
          >
            <SlidersHorizontal size={22} color="#fff" />
          </AnimatedPressable>
        }
      />

      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <FlatList
          data={grouped}
          keyExtractor={(item) => item.date}
          renderItem={renderItem}
          initialNumToRender={10}
          maxToRenderPerBatch={5}
          windowSize={5}
          removeClippedSubviews={true}
          keyboardDismissMode="on-drag"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          ListHeaderComponent={
            <View style={{ paddingHorizontal: spacing[4], paddingBottom: spacing[3] }}>
              <Input
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search SKU or product..."
                icon={<Search size={18} color={colors.textTertiary} />}
              />
            </View>
          }
          ListEmptyComponent={
            isSearchActive ? (
              <EmptyState
                icon={<Search size={48} color={colors.textTertiary} />}
                title="No Results"
                message={`No transactions match "${searchQuery.trim()}". Try a different search term.`}
              />
            ) : (
              <EmptyState
                icon={<ClipboardList size={48} color={colors.textTertiary} />}
                title="No Transactions"
                message="Your transaction history will appear here once you start recording stock movements."
              />
            )
          }
          contentContainerStyle={{
            flexGrow: 1,
            paddingBottom: spacing[4],
          }}
        />
      </View>
    </SafeAreaView>
  );
}
