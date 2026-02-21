import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Package,
  ChevronRight,
  AlertCircle,
} from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeContext';
import { useSyncQueue } from '@/hooks/useSyncQueue';
import { getAllCachedItems, getPendingTransactions, getCachedItem } from '@/lib/db/operations';
import type { PendingTransaction, CachedItem } from '@/lib/db/types';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { SyncStatusIndicator } from '@/components/indicators/SyncStatusIndicator';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { haptic } from '@/lib/haptics';

export default function HomeScreen() {
  const db = useSQLiteContext();
  const { colors, spacing, typePresets, radii, shadows } = useTheme();
  const { pendingCount, isSyncing, lastSyncTime, syncNow } = useSyncQueue();
  const [cachedItemCount, setCachedItemCount] = useState(0);
  const [recentTransactions, setRecentTransactions] = useState<PendingTransaction[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(() => {
    try {
      const items = getAllCachedItems(db);
      setCachedItemCount(items.length);
      const txs = getPendingTransactions(db);
      setRecentTransactions(txs.slice(-5).reverse());
    } catch {
      // DB may not be ready
    }
  }, [db]);

  useEffect(() => {
    loadData();
  }, [loadData, pendingCount]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await syncNow();
    loadData();
    setRefreshing(false);
  }, [syncNow, loadData]);

  const navigateToScan = useCallback(
    (type: 'in' | 'out') => {
      haptic('medium');
      router.push({ pathname: '/(app)/(tabs)/scan', params: { type } });
    },
    [],
  );

  const getItemName = useCallback(
    (itemId: string): string => {
      const item = getCachedItem(db, itemId);
      return item?.name ?? 'Unknown Item';
    },
    [db],
  );

  const renderTransaction = useCallback(
    ({ item }: { item: PendingTransaction }) => {
      const isIn = item.transaction_type === 'in' || item.transaction_type === 'check_in';
      const Icon = isIn ? ArrowDownToLine : ArrowUpFromLine;
      const iconColor = isIn ? colors.success : colors.error;

      return (
        <Card style={{ marginHorizontal: spacing[4], marginBottom: spacing[2] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: radii.md,
                backgroundColor: isIn ? colors.successBackground : colors.errorBackground,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon size={20} color={iconColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{ ...typePresets.bodySmall, color: colors.text, fontWeight: '600' }}
                numberOfLines={1}
              >
                {getItemName(item.item_id)}
              </Text>
              <Text style={{ ...typePresets.caption, color: colors.textSecondary }}>
                {isIn ? 'Stock In' : 'Stock Out'} x{item.quantity}
              </Text>
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
          </View>
        </Card>
      );
    },
    [colors, spacing, radii, typePresets, getItemName],
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScreenHeader
        title="PackTrack"
        rightAction={
          <SyncStatusIndicator
            pendingCount={pendingCount}
            isSyncing={isSyncing}
            lastSyncTime={lastSyncTime}
          />
        }
      />

      <FlatList
        data={recentTransactions}
        keyExtractor={(item) => item.id}
        renderItem={renderTransaction}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View>
            {/* Quick Actions */}
            <View
              style={{
                flexDirection: 'row',
                gap: spacing[3],
                paddingHorizontal: spacing[4],
                marginBottom: spacing[4],
              }}
            >
              <AnimatedPressable
                onPress={() => navigateToScan('in')}
                hapticPattern="medium"
                style={{
                  flex: 1,
                  backgroundColor: colors.successBackground,
                  borderRadius: radii.lg,
                  padding: spacing[4],
                  alignItems: 'center',
                  gap: spacing[2],
                  ...shadows.sm,
                }}
              >
                <ArrowDownToLine size={28} color={colors.success} />
                <Text style={{ ...typePresets.label, color: colors.success }}>
                  Stock In
                </Text>
              </AnimatedPressable>

              <AnimatedPressable
                onPress={() => navigateToScan('out')}
                hapticPattern="medium"
                style={{
                  flex: 1,
                  backgroundColor: colors.errorBackground,
                  borderRadius: radii.lg,
                  padding: spacing[4],
                  alignItems: 'center',
                  gap: spacing[2],
                  ...shadows.sm,
                }}
              >
                <ArrowUpFromLine size={28} color={colors.error} />
                <Text style={{ ...typePresets.label, color: colors.error }}>
                  Stock Out
                </Text>
              </AnimatedPressable>
            </View>

            {/* Summary Stats */}
            <View
              style={{
                flexDirection: 'row',
                gap: spacing[3],
                paddingHorizontal: spacing[4],
                marginBottom: spacing[4],
              }}
            >
              <Card variant="elevated" style={{ flex: 1 }}>
                <View style={{ alignItems: 'center', gap: spacing[1] }}>
                  <Package size={24} color={colors.primary} />
                  <Text style={{ ...typePresets.heading, color: colors.text }}>
                    {cachedItemCount}
                  </Text>
                  <Text style={{ ...typePresets.caption, color: colors.textSecondary }}>
                    Cached Items
                  </Text>
                </View>
              </Card>

              <AnimatedPressable
                onPress={() => {
                  if (pendingCount > 0) {
                    router.push('/(app)/batch-review');
                  }
                }}
                style={{ flex: 1 }}
              >
                <Card variant="elevated" style={{ flex: 1 }}>
                  <View style={{ alignItems: 'center', gap: spacing[1] }}>
                    <AlertCircle
                      size={24}
                      color={pendingCount > 0 ? colors.warning : colors.success}
                    />
                    <Text style={{ ...typePresets.heading, color: colors.text }}>
                      {pendingCount}
                    </Text>
                    <Text style={{ ...typePresets.caption, color: colors.textSecondary }}>
                      Pending Sync
                    </Text>
                  </View>
                </Card>
              </AnimatedPressable>
            </View>

            {/* Recent Transactions Header */}
            {recentTransactions.length > 0 && (
              <SectionHeader
                title="Recent Transactions"
                action={
                  pendingCount > 0
                    ? { label: 'View All', onPress: () => router.push('/(app)/batch-review') }
                    : undefined
                }
              />
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={{ alignItems: 'center', padding: spacing[8] }}>
            <Package size={48} color={colors.textTertiary} />
            <Text
              style={{
                ...typePresets.body,
                color: colors.textSecondary,
                marginTop: spacing[3],
                textAlign: 'center',
              }}
            >
              No recent transactions
            </Text>
            <Text
              style={{
                ...typePresets.bodySmall,
                color: colors.textTertiary,
                marginTop: spacing[1],
                textAlign: 'center',
              }}
            >
              Scan an item to get started
            </Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: spacing[4] }}
      />
    </SafeAreaView>
  );
}
