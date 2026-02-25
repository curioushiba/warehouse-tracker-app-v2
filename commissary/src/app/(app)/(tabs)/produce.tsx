import React, { useCallback, useEffect, useState } from 'react';
import { View, FlatList, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { ChefHat, Search } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSyncQueue } from '@/hooks/useSyncQueue';
import { usePendingDelta } from '@/hooks/usePendingDelta';
import {
  getAllCommissaryItems,
  searchCommissaryItems,
  getTodaysTargets,
  getTodaysProductions,
  getPendingProductionsToday,
} from '@/lib/db/operations';
import { createQuickProduction } from '@/lib/quick-production';
import type { CachedItem } from '@/lib/db/types';
import { screenColors } from '@/theme/tokens';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProduceItemCard } from '@/components/production/ProduceItemCard';
import { haptic } from '@/lib/haptics';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { ResponsiveContainer } from '@/components/layout/ResponsiveContainer';

interface ItemWithContext extends CachedItem {
  target_today: number;
  produced_today: number;
}

export default function ProduceScreen() {
  const db = useSQLiteContext();
  const navigation = useNavigation();
  const { colors, spacing } = useTheme();
  const layout = useResponsiveLayout();
  const { user } = useAuth();
  const { syncNow } = useSyncQueue();

  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState<ItemWithContext[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadItems = useCallback(() => {
    try {
      const rawItems = searchQuery.trim()
        ? searchCommissaryItems(db, searchQuery.trim())
        : getAllCommissaryItems(db);
      const targets = getTodaysTargets(db);
      const productions = getTodaysProductions(db);

      const targetMap = new Map<string, number>();
      for (const t of targets) {
        targetMap.set(t.item_id, t.target_quantity);
      }

      const productionMap = new Map<string, number>();
      for (const p of productions) {
        const existing = productionMap.get(p.item_id) ?? 0;
        productionMap.set(p.item_id, existing + p.quantity_produced);
      }

      // Merge pending (unsynchronised) productions so counts survive refresh
      const pending = getPendingProductionsToday(db);
      for (const p of pending) {
        const existing = productionMap.get(p.item_id) ?? 0;
        productionMap.set(p.item_id, existing + p.quantity_produced);
      }

      const enriched: ItemWithContext[] = rawItems.map((item) => ({
        ...item,
        target_today: targetMap.get(item.id) ?? 0,
        produced_today: productionMap.get(item.id) ?? 0,
      }));

      setItems(enriched);
    } catch {
      // DB may not be ready
    }
  }, [db, searchQuery]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleConfirmProduction = useCallback(
    (itemId: string, quantity: number, type: 'produce' | 'correct') => {
      if (!user) return;
      haptic('success');
      createQuickProduction(db, { itemId, direction: type, quantity });
      // Optimistically update produced_today
      setItems((prev) =>
        prev.map((item) => {
          if (item.id !== itemId) return item;
          const delta = type === 'produce' ? quantity : -quantity;
          return { ...item, produced_today: item.produced_today + delta };
        }),
      );
      void syncNow();
    },
    [db, user, syncNow],
  );

  const {
    activeItemId,
    delta,
    increment,
    decrement,
    confirm,
    cancel,
    hasPending,
    getDisplayProduced,
  } = usePendingDelta(handleConfirmProduction);

  // Auto-submit pending delta when navigating away (blur fires after tab switch,
  // so Alert would appear on the wrong screen — auto-submit is the correct UX)
  useEffect(() => {
    const unsubscribe = navigation.addListener('blur', () => {
      if (!hasPending()) return;
      confirm();
    });
    return unsubscribe;
  }, [navigation, hasPending, confirm]);

  const handleRefresh = useCallback(async () => {
    if (hasPending()) {
      Alert.alert(
        'Unsaved Changes',
        'You have an unconfirmed production change.',
        [
          {
            text: 'Submit & Refresh',
            style: 'default',
            onPress: async () => {
              confirm();
              setRefreshing(true);
              await syncNow();
              loadItems();
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
              loadItems();
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
    loadItems();
    setRefreshing(false);
  }, [syncNow, loadItems, hasPending, confirm, cancel]);

  const showCrossItemAlert = useCallback(
    (itemId: string, change: 1 | -1) => {
      Alert.alert(
        'Pending Change',
        'Another item has an unconfirmed production change.',
        [
          {
            text: 'Submit',
            style: 'default',
            onPress: () => {
              confirm();
              if (change === 1) increment(itemId);
              else decrement(itemId);
            },
          },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              cancel();
              if (change === 1) increment(itemId);
              else decrement(itemId);
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ],
      );
    },
    [confirm, cancel, increment, decrement],
  );

  const handleQuickProduce = useCallback(
    (itemId: string) => {
      haptic('light');
      const result = increment(itemId);
      if (result === 'needs-resolve') {
        showCrossItemAlert(itemId, 1);
      }
    },
    [increment, showCrossItemAlert],
  );

  const handleQuickCorrect = useCallback(
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
    ({ item }: { item: ItemWithContext }) => {
      const itemDelta = activeItemId === item.id ? delta : undefined;
      const itemDisplayProduced =
        activeItemId === item.id
          ? getDisplayProduced(item.id, item.produced_today)
          : undefined;

      return (
        <View style={{
          flex: 1,
          paddingHorizontal: layout.listColumns > 1 ? 0 : layout.contentPadding,
        }}>
          <ProduceItemCard
            item={item}
            target={item.target_today}
            produced={item.produced_today}
            displayProduced={itemDisplayProduced}
            pendingDelta={itemDelta}
            onIncrement={handleQuickProduce}
            onDecrement={handleQuickCorrect}
            onConfirm={confirm}
            onCancel={cancel}
          />
        </View>
      );
    },
    [handleQuickProduce, handleQuickCorrect, activeItemId, delta, getDisplayProduced, confirm, cancel, layout],
  );

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: screenColors.produce }}
      edges={['top']}
    >
      <ScreenHeader title="Log Production" headerColor={screenColors.produce} />

      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {/* Search */}
        <ResponsiveContainer maxWidth={layout.contentMaxWidth} style={{ padding: spacing[4], paddingBottom: spacing[2] }}>
          <Input
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search items..."
            icon={<Search size={20} color={colors.iconSecondary} />}
          />
        </ResponsiveContainer>

        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          numColumns={layout.listColumns}
          key={String(layout.listColumns)}
          initialNumToRender={10}
          maxToRenderPerBatch={8}
          windowSize={5}
          {...(layout.listColumns > 1 && {
            columnWrapperStyle: {
              gap: layout.gutterWidth,
              paddingHorizontal: layout.contentPadding,
            },
          })}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon={<ChefHat size={48} color={colors.textTertiary} />}
              title="No items found"
              message={
                searchQuery
                  ? 'Try a different search term'
                  : 'Commissary items will appear here once synced'
              }
            />
          }
          contentContainerStyle={{ paddingBottom: spacing[4] }}
        />
      </View>
    </SafeAreaView>
  );
}
