import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import { ChefHat } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSyncQueue } from '@/hooks/useSyncQueue';
import {
  getAllCommissaryItems,
  getTodaysTargets,
  getTodaysProductions,
} from '@/lib/db/operations';
import type { CachedTarget, CachedProduction } from '@/lib/db/types';
import { screenColors } from '@/theme/tokens';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { SyncStatusIndicator } from '@/components/indicators/SyncStatusIndicator';
import { ProductionItemCard } from '@/components/production/ProductionItemCard';
import type { PriorityLevel } from '@/lib/types';
import type { CachedItem } from '@/lib/db/types';

interface DashboardItem {
  id: string;
  name: string;
  unit: string;
  current_stock: number;
  target: number;
  produced: number;
  priority: PriorityLevel;
}

const PRIORITY_ORDER: Record<PriorityLevel, number> = {
  CRITICAL: 0,
  URGENT: 1,
  HIGH: 2,
  NORMAL: 3,
};

function getPriorityFromValue(value: number): PriorityLevel {
  if (value >= 90) return 'CRITICAL';
  if (value >= 70) return 'URGENT';
  if (value >= 50) return 'HIGH';
  return 'NORMAL';
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export default function DashboardScreen() {
  const db = useSQLiteContext();
  const { colors, spacing, typePresets, radii } = useTheme();
  const { user } = useAuth();
  const { pendingCount, isSyncing, lastSyncTime, syncNow } = useSyncQueue();
  const [dashboardItems, setDashboardItems] = useState<DashboardItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(() => {
    try {
      const items = getAllCommissaryItems(db);
      const targets = getTodaysTargets(db);
      const productions = getTodaysProductions(db);

      const targetMap = new Map<string, CachedTarget>();
      for (const t of targets) {
        targetMap.set(t.item_id, t);
      }

      const productionMap = new Map<string, number>();
      for (const p of productions) {
        const existing = productionMap.get(p.item_id) ?? 0;
        productionMap.set(p.item_id, existing + p.quantity_produced);
      }

      const combined: DashboardItem[] = items.map((item) => {
        const target = targetMap.get(item.id);
        const produced = productionMap.get(item.id) ?? 0;
        const priorityValue = target?.priority ?? 0;

        return {
          id: item.id,
          name: item.name,
          unit: item.unit,
          current_stock: item.current_stock,
          target: target?.target_quantity ?? 0,
          produced,
          priority: getPriorityFromValue(priorityValue),
        };
      });

      combined.sort(
        (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority],
      );

      setDashboardItems(combined);
    } catch {
      // DB may not be ready
    } finally {
      setLoading(false);
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

  const totalItems = dashboardItems.length;
  const totalTarget = dashboardItems.reduce((sum, item) => sum + item.target, 0);
  const totalProduced = dashboardItems.reduce((sum, item) => sum + item.produced, 0);

  const listHeader = (
    <View>
      {/* Summary Cards */}
      <View
        style={{
          flexDirection: 'row',
          gap: spacing[3],
          paddingHorizontal: spacing[4],
          marginBottom: spacing[4],
        }}
      >
        <Card variant="elevated" style={{ flex: 1, alignItems: 'center' }}>
          <Text
            style={{
              ...typePresets.heading,
              color: colors.primary,
            }}
          >
            {totalItems}
          </Text>
          <Text
            style={{
              ...typePresets.caption,
              color: colors.textSecondary,
              marginTop: spacing[1],
            }}
          >
            Items
          </Text>
        </Card>

        <Card variant="elevated" style={{ flex: 1, alignItems: 'center' }}>
          <Text
            style={{
              ...typePresets.heading,
              color: colors.info,
            }}
          >
            {totalTarget}
          </Text>
          <Text
            style={{
              ...typePresets.caption,
              color: colors.textSecondary,
              marginTop: spacing[1],
            }}
          >
            Today's Target
          </Text>
        </Card>

        <Card variant="elevated" style={{ flex: 1, alignItems: 'center' }}>
          <Text
            style={{
              ...typePresets.heading,
              color: colors.success,
            }}
          >
            {totalProduced}
          </Text>
          <Text
            style={{
              ...typePresets.caption,
              color: colors.textSecondary,
              marginTop: spacing[1],
            }}
          >
            Produced
          </Text>
        </Card>
      </View>

      {/* Section Header */}
      {dashboardItems.length > 0 && (
        <SectionHeader title="Priority Items" />
      )}
    </View>
  );

  const renderItem = useCallback(
    ({ item }: { item: DashboardItem }) => (
      <View style={{ paddingHorizontal: spacing[4], marginBottom: spacing[2] }}>
        <ProductionItemCard
          item={{
            id: item.id,
            name: item.name,
            unit: item.unit,
            current_stock: item.current_stock,
          }}
          target={item.target}
          produced={item.produced}
          priority={item.priority}
          onPress={() => {
            // Navigate to produce tab or show quick-produce
          }}
        />
      </View>
    ),
    [spacing],
  );

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: screenColors.dashboard }}
      edges={['top']}
    >
      <ScreenHeader
        title="Dashboard"
        subtitle={formatDate()}
        headerColor={screenColors.dashboard}
        rightAction={
          <SyncStatusIndicator
            pendingCount={pendingCount}
            isSyncing={isSyncing}
            lastSyncTime={lastSyncTime}
          />
        }
      />

      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <FlatList
          data={dashboardItems}
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
            loading ? null : (
              <EmptyState
                icon={<ChefHat size={48} color={colors.textTertiary} />}
                title="No items yet"
                message="Production items will appear here once synced"
              />
            )
          }
          contentContainerStyle={{ paddingTop: spacing[4], paddingBottom: spacing[4] }}
        />
      </View>
    </SafeAreaView>
  );
}
