import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import { randomUUID } from 'expo-crypto';
import { ChefHat, Search, X } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSyncQueue } from '@/hooks/useSyncQueue';
import {
  getAllCommissaryItems,
  searchCommissaryItems,
  getTodaysTargets,
  getTodaysProductions,
  enqueueProduction,
} from '@/lib/db/operations';
import type { CachedItem, CachedTarget, PendingProduction } from '@/lib/db/types';
import { screenColors } from '@/theme/tokens';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { EmptyState } from '@/components/ui/EmptyState';
import { haptic } from '@/lib/haptics';

interface ItemWithContext extends CachedItem {
  target_today: number;
  produced_today: number;
}

export default function ProduceScreen() {
  const db = useSQLiteContext();
  const { colors, spacing, typePresets, radii } = useTheme();
  const { user } = useAuth();
  const { syncNow } = useSyncQueue();

  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState<ItemWithContext[]>([]);
  const [selectedItem, setSelectedItem] = useState<ItemWithContext | null>(null);
  const [quantity, setQuantity] = useState('');
  const [wasteQuantity, setWasteQuantity] = useState('');
  const [wasteReason, setWasteReason] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  const handleSelectItem = useCallback((item: ItemWithContext) => {
    haptic('light');
    setSelectedItem(item);
    setQuantity('');
    setWasteQuantity('');
    setWasteReason('');
    setNotes('');
  }, []);

  const handleCancel = useCallback(() => {
    setSelectedItem(null);
    setQuantity('');
    setWasteQuantity('');
    setWasteReason('');
    setNotes('');
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!selectedItem || !user) return;

    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Invalid Quantity', 'Please enter a valid quantity greater than 0.');
      return;
    }

    const waste = wasteQuantity ? parseFloat(wasteQuantity) : 0;
    if (wasteQuantity && (isNaN(waste) || waste < 0)) {
      Alert.alert('Invalid Waste', 'Please enter a valid waste quantity.');
      return;
    }

    setSubmitting(true);

    try {
      const production: PendingProduction = {
        id: randomUUID(),
        item_id: selectedItem.id,
        quantity_produced: qty,
        waste_quantity: waste,
        waste_reason: waste > 0 ? wasteReason || null : null,
        notes: notes.trim() || null,
        device_timestamp: new Date().toISOString(),
        created_at: new Date().toISOString(),
        status: 'pending',
      };

      enqueueProduction(db, production);
      haptic('success');
      void syncNow();

      setSelectedItem(null);
      setQuantity('');
      setWasteQuantity('');
      setWasteReason('');
      setNotes('');
      loadItems();
    } catch {
      Alert.alert('Error', 'Failed to save production log. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [selectedItem, user, quantity, wasteQuantity, wasteReason, notes, db, syncNow, loadItems]);

  const renderItemCard = useCallback(
    ({ item }: { item: ItemWithContext }) => {
      const progress = item.target_today > 0
        ? Math.min(item.produced_today / item.target_today, 1)
        : 0;

      return (
        <AnimatedPressable
          onPress={() => handleSelectItem(item)}
          hapticPattern="light"
          style={{ marginHorizontal: spacing[4], marginBottom: spacing[2] }}
        >
          <Card>
            <View style={{ gap: spacing[2] }}>
              <Text style={{ ...typePresets.label, color: colors.text }}>
                {item.name}
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Text style={{ ...typePresets.bodySmall, color: colors.textSecondary }}>
                  Stock: {item.current_stock} {item.unit}
                </Text>
                <Text style={{ ...typePresets.bodySmall, color: colors.textSecondary }}>
                  Target: {item.produced_today} / {item.target_today} {item.unit}
                </Text>
              </View>
              {item.target_today > 0 && (
                <View
                  style={{
                    height: 6,
                    borderRadius: radii.full,
                    backgroundColor: colors.surfaceSecondary,
                    overflow: 'hidden',
                  }}
                >
                  <View
                    style={{
                      height: '100%',
                      width: `${progress * 100}%`,
                      borderRadius: radii.full,
                      backgroundColor: progress >= 1 ? colors.success : colors.primary,
                    }}
                  />
                </View>
              )}
            </View>
          </Card>
        </AnimatedPressable>
      );
    },
    [spacing, typePresets, colors, radii, handleSelectItem],
  );

  if (selectedItem) {
    const waste = parseFloat(wasteQuantity);
    const showWasteReason = !isNaN(waste) && waste > 0;

    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: screenColors.produce }}
        edges={['top']}
      >
        <ScreenHeader title="Log Production" headerColor={screenColors.produce} />

        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: colors.background }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={{ padding: spacing[4], gap: spacing[4] }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Item Info */}
            <Card variant="elevated">
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: spacing[2],
                }}
              >
                <Text style={{ ...typePresets.title, color: colors.text }}>
                  {selectedItem.name}
                </Text>
                <AnimatedPressable onPress={handleCancel} hapticPattern="light">
                  <X size={24} color={colors.textSecondary} />
                </AnimatedPressable>
              </View>
              <Text style={{ ...typePresets.bodySmall, color: colors.textSecondary }}>
                Current Stock: {selectedItem.current_stock} {selectedItem.unit}
              </Text>
              {selectedItem.target_today > 0 && (
                <Text
                  style={{
                    ...typePresets.bodySmall,
                    color: colors.textSecondary,
                    marginTop: spacing[1],
                  }}
                >
                  Today: {selectedItem.produced_today} / {selectedItem.target_today}{' '}
                  {selectedItem.unit} produced
                </Text>
              )}
            </Card>

            {/* Production Form */}
            <Card>
              <View style={{ gap: spacing[4] }}>
                <Input
                  label="Quantity Produced"
                  value={quantity}
                  onChangeText={setQuantity}
                  placeholder="Enter quantity"
                  keyboardType="numeric"
                />

                <Input
                  label="Waste Quantity (optional)"
                  value={wasteQuantity}
                  onChangeText={setWasteQuantity}
                  placeholder="0"
                  keyboardType="numeric"
                />

                {showWasteReason && (
                  <Input
                    label="Waste Reason"
                    value={wasteReason}
                    onChangeText={setWasteReason}
                    placeholder="Why was there waste?"
                  />
                )}

                <Input
                  label="Notes (optional)"
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Additional notes..."
                  multiline
                />

                <View style={{ flexDirection: 'row', gap: spacing[3] }}>
                  <View style={{ flex: 1 }}>
                    <Button
                      title="Cancel"
                      onPress={handleCancel}
                      variant="secondary"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button
                      title="Submit"
                      onPress={handleSubmit}
                      variant="primary"
                      loading={submitting}
                    />
                  </View>
                </View>
              </View>
            </Card>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: screenColors.produce }}
      edges={['top']}
    >
      <ScreenHeader title="Log Production" headerColor={screenColors.produce} />

      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {/* Search */}
        <View style={{ padding: spacing[4], paddingBottom: spacing[2] }}>
          <Input
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search items..."
            icon={<Search size={20} color={colors.iconSecondary} />}
          />
        </View>

        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItemCard}
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
