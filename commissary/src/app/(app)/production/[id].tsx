import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import { ArrowLeft, Clock, Package, AlertTriangle, FileText } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeContext';
import { getTodaysProductions, getCachedItem } from '@/lib/db/operations';
import { screenColors } from '@/theme/tokens';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import type { CachedProduction } from '@/lib/db/types';

interface ProductionDetail extends CachedProduction {
  item_name?: string;
}

export default function ProductionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const { colors, spacing, typePresets, radii } = useTheme();
  const [production, setProduction] = useState<ProductionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    try {
      const productions = getTodaysProductions(db);
      const found = productions.find((p) => p.id === id) ?? null;
      if (found) {
        const item = getCachedItem(db, found.item_id);
        setProduction({ ...found, item_name: item?.name });
      }
    } catch {
      // DB may not be ready
    } finally {
      setLoading(false);
    }
  }, [db, id]);

  const formatTimestamp = (iso: string): string => {
    const date = new Date(iso);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: colors.background }}
      >
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!production) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: colors.background }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: spacing[4],
            gap: spacing[3],
          }}
        >
          <AnimatedPressable onPress={() => router.back()} hapticPattern="light">
            <ArrowLeft size={24} color={colors.text} />
          </AnimatedPressable>
          <Text style={{ ...typePresets.heading, color: colors.text }}>
            Production Detail
          </Text>
        </View>
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: spacing[8],
          }}
        >
          <Text style={{ ...typePresets.title, color: colors.text, marginBottom: spacing[2] }}>
            Not Found
          </Text>
          <Text style={{ ...typePresets.body, color: colors.textSecondary, textAlign: 'center' }}>
            This production record could not be found.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const statusVariant = production.status === 'synced'
    ? 'success'
    : production.status === 'failed'
      ? 'error'
      : 'warning';

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: screenColors.productionDetail }}
      edges={['top']}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: spacing[4],
          gap: spacing[3],
          backgroundColor: screenColors.productionDetail,
          borderBottomLeftRadius: radii.lg,
          borderBottomRightRadius: radii.lg,
        }}
      >
        <AnimatedPressable onPress={() => router.back()} hapticPattern="light">
          <ArrowLeft size={24} color={colors.textInverse} />
        </AnimatedPressable>
        <Text style={{ ...typePresets.heading, color: colors.textInverse }}>
          Production Detail
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ padding: spacing[4], gap: spacing[4] }}
      >
        {/* Status + Timestamp */}
        <Card variant="elevated">
          <View style={{ gap: spacing[3] }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Badge label={production.status} variant={statusVariant} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1] }}>
                <Clock size={14} color={colors.textTertiary} />
                <Text style={{ ...typePresets.caption, color: colors.textTertiary }}>
                  {formatTimestamp(production.event_timestamp)}
                </Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Quantity Produced */}
        <Card>
          <View style={{ gap: spacing[2] }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
              <Package size={20} color={colors.primary} />
              <Text style={{ ...typePresets.label, color: colors.textSecondary }}>
                Quantity Produced
              </Text>
            </View>
            <Text style={{ ...typePresets.heading, color: colors.text }}>
              {production.quantity_produced}
            </Text>
          </View>
        </Card>

        {/* Item ID */}
        <Card>
          <View style={{ gap: spacing[2] }}>
            <Text style={{ ...typePresets.label, color: colors.textSecondary }}>
              Item ID
            </Text>
            <Text
              style={{
                ...typePresets.bodySmall,
                color: colors.text,
                fontFamily: 'monospace',
              }}
              selectable
            >
              {production.item_id}
            </Text>
          </View>
        </Card>

        {/* Production ID */}
        <Card>
          <View style={{ gap: spacing[2] }}>
            <Text style={{ ...typePresets.label, color: colors.textSecondary }}>
              Production ID
            </Text>
            <Text
              style={{
                ...typePresets.bodySmall,
                color: colors.text,
                fontFamily: 'monospace',
              }}
              selectable
            >
              {production.id}
            </Text>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
