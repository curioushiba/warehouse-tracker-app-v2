import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Search,
  SlidersHorizontal,
  Package,
} from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSyncQueue } from '@/hooks/useSyncQueue';
import { getPendingTransactions } from '@/lib/db/operations';
import type { CachedItem } from '@/lib/db/types';
import { supabase } from '@/lib/supabase';
import { fetchRecentTransactions } from '@/lib/sync';
import { mergeTransactions } from '@/lib/transactions';
import { getRecentlyAccessedItems } from '@/lib/recently-accessed';
import { createQuickTransaction } from '@/lib/quick-transaction';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { Card } from '@/components/ui/Card';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { EmptyState } from '@/components/ui/EmptyState';
import { InventoryItemCard } from '@/components/inventory/InventoryItemCard';
import { haptic } from '@/lib/haptics';

export default function HomeScreen() {
  const db = useSQLiteContext();
  const { colors, spacing, typePresets, radii, shadows } = useTheme();
  const { user } = useAuth();
  const { pendingCount, syncNow } = useSyncQueue();
  const [recentItems, setRecentItems] = useState<CachedItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const pending = getPendingTransactions(db);

      let completed: Awaited<ReturnType<typeof fetchRecentTransactions>> = [];
      if (user?.id && supabase) {
        completed = await fetchRecentTransactions(supabase, user.id, 20);
      }

      const merged = mergeTransactions(pending, completed);
      const items = getRecentlyAccessedItems(db, merged, 10);
      setRecentItems(items);
    } catch {
      // DB may not be ready
    }
  }, [db, user?.id]);

  useEffect(() => {
    void loadData();
  }, [loadData, pendingCount]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await syncNow();
    await loadData();
    setRefreshing(false);
  }, [syncNow, loadData]);

  const navigateToScan = useCallback(
    (type: 'check_in' | 'check_out') => {
      haptic('medium');
      router.push({ pathname: '/(app)/(tabs)/scan', params: { type } });
    },
    [],
  );

  const handleQuickIn = useCallback(
    (itemId: string) => {
      haptic('success');
      createQuickTransaction(db, { itemId, type: 'check_in' });
      setRecentItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, current_stock: item.current_stock + 1 } : item,
        ),
      );
      void syncNow();
    },
    [db, syncNow],
  );

  const handleQuickOut = useCallback(
    (itemId: string) => {
      haptic('warning');
      createQuickTransaction(db, { itemId, type: 'check_out' });
      setRecentItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, current_stock: item.current_stock - 1 } : item,
        ),
      );
      void syncNow();
    },
    [db, syncNow],
  );

  const renderItem = useCallback(
    ({ item }: { item: CachedItem }) => (
      <InventoryItemCard
        item={item}
        onQuickIn={handleQuickIn}
        onQuickOut={handleQuickOut}
      />
    ),
    [handleQuickIn, handleQuickOut],
  );

  const listHeader = (
    <View>
      {/* Search bar */}
      <AnimatedPressable
        onPress={() => router.push('/(app)/(tabs)/scan')}
        hapticPattern="light"
        style={{ marginHorizontal: spacing[4], marginBottom: spacing[4] }}
      >
        <Card variant="elevated">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
            <Search size={20} color={colors.textTertiary} />
            <Text
              style={{
                ...typePresets.body,
                color: colors.textTertiary,
                flex: 1,
              }}
            >
              Search items...
            </Text>
            <SlidersHorizontal size={20} color={colors.textTertiary} />
          </View>
        </Card>
      </AnimatedPressable>

      {/* Action buttons */}
      <View
        style={{
          flexDirection: 'row',
          gap: spacing[3],
          paddingHorizontal: spacing[4],
          marginBottom: spacing[4],
        }}
      >
        <AnimatedPressable
          onPress={() => navigateToScan('check_in')}
          hapticPattern="medium"
          style={{ flex: 1 }}
        >
          <Card variant="elevated" style={{ alignItems: 'center', gap: spacing[3] }}>
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: radii.full,
                backgroundColor: colors.successBackground,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ArrowDownToLine size={24} color={colors.success} />
            </View>
            <Text style={{ ...typePresets.label, color: colors.text }}>
              Receive Stock
            </Text>
          </Card>
        </AnimatedPressable>

        <AnimatedPressable
          onPress={() => navigateToScan('check_out')}
          hapticPattern="medium"
          style={{ flex: 1 }}
        >
          <Card variant="elevated" style={{ alignItems: 'center', gap: spacing[3] }}>
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: radii.full,
                backgroundColor: colors.errorBackground,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ArrowUpFromLine size={24} color={colors.error} />
            </View>
            <Text style={{ ...typePresets.label, color: colors.text }}>
              Issue Stock
            </Text>
          </Card>
        </AnimatedPressable>
      </View>

      {/* Section header */}
      {recentItems.length > 0 && (
        <SectionHeader
          title="Recently Accessed"
          action={{ label: 'View All', onPress: () => router.push('/(app)/(tabs)/history') }}
        />
      )}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScreenHeader title="PackTrack" />

      <FlatList
        data={recentItems}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          <EmptyState
            icon={<Package size={48} color={colors.textTertiary} />}
            title="No items yet"
            message="Scan an item or receive stock to get started"
          />
        }
        contentContainerStyle={{ paddingBottom: spacing[4] }}
      />
    </SafeAreaView>
  );
}
