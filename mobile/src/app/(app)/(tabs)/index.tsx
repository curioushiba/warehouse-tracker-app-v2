import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, RefreshControl, Alert } from 'react-native';
import { router, useNavigation } from 'expo-router';
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
import { usePendingDelta } from '@/hooks/usePendingDelta';
import { getPendingTransactions } from '@/lib/db/operations';
import type { CachedItem } from '@/lib/db/types';
import { supabase } from '@/lib/supabase';
import { fetchRecentTransactions } from '@/lib/sync';
import { mergeTransactions } from '@/lib/transactions';
import { getRecentlyAccessedItems } from '@/lib/recently-accessed';
import { createQuickTransaction } from '@/lib/quick-transaction';
import { screenColors } from '@/theme/tokens';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { Card } from '@/components/ui/Card';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { EmptyState } from '@/components/ui/EmptyState';
import { InventoryItemCard } from '@/components/inventory/InventoryItemCard';
import { haptic } from '@/lib/haptics';

export default function HomeScreen() {
  const db = useSQLiteContext();
  const navigation = useNavigation();
  const { colors, spacing, typePresets, radii, shadows } = useTheme();
  const { user } = useAuth();
  const { pendingCount, syncNow } = useSyncQueue();
  const [recentItems, setRecentItems] = useState<CachedItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const handleConfirmTransaction = useCallback(
    (itemId: string, quantity: number, type: 'check_in' | 'check_out') => {
      haptic('success');
      createQuickTransaction(db, { itemId, type, quantity });
      setRecentItems((prev) =>
        prev.map((item) => {
          if (item.id !== itemId) return item;
          const delta = type === 'check_in' ? quantity : -quantity;
          return { ...item, current_stock: item.current_stock + delta };
        }),
      );
      void syncNow();
    },
    [db, syncNow],
  );

  const {
    activeItemId,
    delta,
    increment,
    decrement,
    confirm,
    cancel,
    hasPending,
    getDisplayStock,
  } = usePendingDelta(handleConfirmTransaction);

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

  // Guard navigation away with pending delta
  useEffect(() => {
    const unsubscribe = navigation.addListener('blur', () => {
      if (!hasPending()) return;

      // Can't prevent navigation in expo-router, so show alert to submit/discard
      Alert.alert(
        'Unsaved Changes',
        'You have an unconfirmed quantity change.',
        [
          { text: 'Submit', style: 'default', onPress: () => confirm() },
          { text: 'Discard', style: 'destructive', onPress: () => cancel() },
        ],
      );
    });

    return unsubscribe;
  }, [navigation, hasPending, confirm, cancel]);

  const handleRefresh = useCallback(async () => {
    if (hasPending()) {
      Alert.alert(
        'Unsaved Changes',
        'You have an unconfirmed quantity change.',
        [
          {
            text: 'Submit & Refresh',
            style: 'default',
            onPress: async () => {
              confirm();
              setRefreshing(true);
              await syncNow();
              await loadData();
              setRefreshing(false);
            },
          },
          {
            text: 'Discard & Refresh',
            style: 'destructive',
            onPress: async () => {
              cancel();
              setRefreshing(true);
              await syncNow();
              await loadData();
              setRefreshing(false);
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ],
      );
      return;
    }

    setRefreshing(true);
    await syncNow();
    await loadData();
    setRefreshing(false);
  }, [syncNow, loadData, hasPending, confirm, cancel]);

  const navigateToScan = useCallback(
    (type: 'check_in' | 'check_out') => {
      haptic('medium');
      router.push({ pathname: '/(app)/(tabs)/scan', params: { type } });
    },
    [],
  );

  const showCrossItemAlert = useCallback(
    (itemId: string, change: 1 | -1) => {
      Alert.alert(
        'Pending Change',
        'Another item has an unconfirmed change.',
        [
          {
            text: 'Submit',
            style: 'default',
            onPress: () => {
              confirm();
              // Now apply the new item's change
              if (change === 1) {
                increment(itemId);
              } else {
                decrement(itemId);
              }
            },
          },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              cancel();
              if (change === 1) {
                increment(itemId);
              } else {
                decrement(itemId);
              }
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ],
      );
    },
    [confirm, cancel, increment, decrement],
  );

  const handleQuickIn = useCallback(
    (itemId: string) => {
      haptic('light');
      const result = increment(itemId);
      if (result === 'needs-resolve') {
        showCrossItemAlert(itemId, 1);
      }
    },
    [increment, showCrossItemAlert],
  );

  const handleQuickOut = useCallback(
    (itemId: string) => {
      haptic('light');
      const result = decrement(itemId);
      if (result === 'needs-resolve') {
        showCrossItemAlert(itemId, -1);
      }
    },
    [decrement, showCrossItemAlert],
  );

  const renderItem = useCallback(
    ({ item }: { item: CachedItem }) => {
      const itemDelta = activeItemId === item.id ? delta : undefined;
      const itemDisplayStock =
        activeItemId === item.id ? getDisplayStock(item.id, item.current_stock) : undefined;

      return (
        <InventoryItemCard
          item={item}
          onQuickIn={handleQuickIn}
          onQuickOut={handleQuickOut}
          pendingDelta={itemDelta}
          displayStock={itemDisplayStock}
          onConfirm={confirm}
          onCancel={cancel}
        />
      );
    },
    [handleQuickIn, handleQuickOut, activeItemId, delta, getDisplayStock, confirm, cancel],
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
    <SafeAreaView style={{ flex: 1, backgroundColor: screenColors.home }} edges={['top']}>
      <ScreenHeader title="PackTrack" headerColor={screenColors.home} />

      <View style={{ flex: 1, backgroundColor: colors.background }}>
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
      </View>
    </SafeAreaView>
  );
}
