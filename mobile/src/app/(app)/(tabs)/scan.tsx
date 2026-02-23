import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { View, Text, FlatList, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import {
  CameraView,
  useCameraPermissions,
  type BarcodeScanningResult,
} from 'expo-camera';
import {
  Search,
  ScanLine,
  Package,
} from 'lucide-react-native';
import { randomUUID } from 'expo-crypto';
import { useTheme } from '@/theme/ThemeContext';
import { useSyncQueue } from '@/hooks/useSyncQueue';
import { useDebounce } from '@/hooks/useDebounce';
import {
  searchCachedItemsLimited,
  getCachedItemByBarcode,
  getCachedItemBySku,
  enqueueTransaction,
  getAllCachedItems,
  getDistinctCategories,
  getLowStockItems,
  getItemsByCategory,
  getItemCount,
} from '@/lib/db/operations';
import type { CachedItem } from '@/lib/db/types';
import type { PendingTransaction } from '@/lib/db/types';
import type { TransactionType } from '@/lib/types';
import {
  addToCart,
  removeFromCart,
  updateQuantity,
  updateNotes,
  getCartItemCount,
  getCartTotalQuantity,
  validateCart,
  cartToArray,
  isInCart,
  getCartQuantity,
  type CartState,
} from '@/lib/cart';
import { screenColors } from '@/theme/tokens';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { StockLevelIndicator } from '@/components/indicators/StockLevelIndicator';
import { TransactionTypeToggle } from '@/components/cart/TransactionTypeToggle';
import { CategoryChipBar } from '@/components/inventory/CategoryChipBar';
import { LowStockSection } from '@/components/inventory/LowStockSection';
import { CartReviewSheet } from '@/components/cart/CartReviewSheet';
import { CartSummaryBar } from '@/components/cart/CartSummaryBar';
import { haptic } from '@/lib/haptics';

export default function ScanScreen() {
  const db = useSQLiteContext();
  const params = useLocalSearchParams<{ type?: string }>();
  const { colors, spacing, typePresets, radii } = useTheme();
  const { syncNow, pendingCount } = useSyncQueue();
  const [permission, requestPermission] = useCameraPermissions();
  const listRef = useRef<FlatList<CachedItem>>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartState>(new Map());
  const [transactionType, setTransactionType] = useState<TransactionType>(
    params.type === 'check_out' ? 'check_out' : 'check_in',
  );
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [reviewVisible, setReviewVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Browse state
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [lowStockItems, setLowStockItems] = useState<CachedItem[]>([]);
  const [allItems, setAllItems] = useState<CachedItem[]>([]);
  const [itemCount, setItemCount] = useState(0);

  // Update transaction type when navigated with param
  useEffect(() => {
    if (params.type === 'check_out' || params.type === 'check_in') {
      setTransactionType(params.type);
    }
  }, [params.type]);

  // Load browse data on mount and when pendingCount changes (after sync)
  useEffect(() => {
    setCategories(getDistinctCategories(db));
    setLowStockItems(getLowStockItems(db, 10));
    setItemCount(getItemCount(db));
    if (!selectedCategory) {
      setAllItems(getAllCachedItems(db));
    }
  }, [db, pendingCount, selectedCategory]);

  // Load category-filtered items
  useEffect(() => {
    if (selectedCategory) {
      setAllItems(getItemsByCategory(db, selectedCategory));
    } else {
      setAllItems(getAllCachedItems(db));
    }
  }, [db, selectedCategory]);

  // Debounced search: only query DB after 300ms pause
  const debouncedQuery = useDebounce(searchQuery.trim(), 300);
  const isSearching = debouncedQuery.length >= 2;

  const searchResults = useMemo(() => {
    if (!isSearching) return [];
    return searchCachedItemsLimited(db, debouncedQuery, 50);
  }, [debouncedQuery, db, isSearching]);

  const displayedItems = isSearching ? searchResults : allItems;

  const cartItemCount = getCartItemCount(cart);
  const cartTotalQty = getCartTotalQuantity(cart);

  // --- Cart handlers ---

  const handleAddToCart = useCallback(
    (item: CachedItem) => {
      setCart((prev) => addToCart(prev, item));
    },
    [],
  );

  const handleRemoveFromCart = useCallback(
    (itemId: string) => {
      setCart((prev) => removeFromCart(prev, itemId));
    },
    [],
  );

  const handleUpdateQuantity = useCallback(
    (itemId: string, qty: number) => {
      setCart((prev) => updateQuantity(prev, itemId, qty));
    },
    [],
  );

  const handleUpdateNotes = useCallback(
    (itemId: string, notes: string) => {
      setCart((prev) => updateNotes(prev, itemId, notes));
    },
    [],
  );

  const handleClearCart = useCallback(() => {
    Alert.alert('Clear Cart', 'Remove all items from the cart?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          haptic('medium');
          setCart(new Map());
        },
      },
    ]);
  }, []);

  // --- Barcode scanning ---

  const handleToggleScanner = useCallback(() => {
    if (!scanning && permission && !permission.granted) {
      requestPermission();
      return;
    }
    setScanning((prev) => !prev);
    setScanned(false);
  }, [scanning, permission, requestPermission]);

  const handleBarcodeScanned = useCallback(
    (result: BarcodeScanningResult) => {
      if (scanned) return;
      setScanned(true);

      const code = result.data;
      const item =
        getCachedItemByBarcode(db, code) ?? getCachedItemBySku(db, code);

      if (item && !item.is_archived) {
        haptic('success');
        setCart((prev) => addToCart(prev, item));
        // Auto-reset after 1s for continuous scanning
        setTimeout(() => setScanned(false), 1000);
      } else {
        haptic('warning');
        Alert.alert(
          'Item Not Found',
          `No item found with barcode "${code}".`,
          [{ text: 'OK', onPress: () => setScanned(false) }],
        );
      }
    },
    [db, scanned],
  );

  // --- Low stock item press → scroll to item in list ---

  const handleLowStockPress = useCallback(
    (itemId: string) => {
      // Clear category filter and search to show all items
      setSelectedCategory(null);
      setSearchQuery('');
      // Find item index in allItems after state settles
      requestAnimationFrame(() => {
        const idx = allItems.findIndex((i) => i.id === itemId);
        if (idx >= 0 && listRef.current) {
          listRef.current.scrollToIndex({ index: idx, animated: true, viewPosition: 0.3 });
        }
      });
    },
    [allItems],
  );

  // --- Batch submission ---

  const handleConfirmBatch = useCallback(async () => {
    const errors = validateCart(cart);
    if (errors.length > 0) {
      Alert.alert(
        'Validation Error',
        errors.map((e) => `${e.itemName}: ${e.error}`).join('\n'),
      );
      return;
    }

    const count = getCartItemCount(cart);
    const typeLabel = transactionType === 'check_in' ? 'Stock In' : 'Stock Out';

    Alert.alert(
      `Confirm ${typeLabel}`,
      `Submit ${count} item${count !== 1 ? 's' : ''} as ${typeLabel}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setSubmitting(true);
            try {
              const now = new Date().toISOString();
              const items = cartToArray(cart);

              for (const cartItem of items) {
                const tx: PendingTransaction = {
                  id: randomUUID(),
                  item_id: cartItem.item.id,
                  transaction_type: transactionType,
                  quantity: cartItem.quantity,
                  notes: cartItem.notes.trim() || null,
                  device_timestamp: now,
                  created_at: now,
                  status: 'pending',
                };
                enqueueTransaction(db, tx);
              }

              haptic('success');
              void syncNow();

              setCart(new Map());
              setReviewVisible(false);

              Alert.alert(
                'Success',
                `${items.length} transaction${items.length !== 1 ? 's' : ''} queued for sync.`,
              );
            } catch {
              haptic('error');
              Alert.alert('Error', 'Failed to save transactions. Please try again.');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ],
    );
  }, [cart, transactionType, db, syncNow]);

  // --- Item list rendering ---

  const renderItem = useCallback(
    ({ item }: { item: CachedItem }) => {
      const inCart = isInCart(cart, item.id);
      const qty = getCartQuantity(cart, item.id);

      return (
        <AnimatedPressable
          onPress={() => handleAddToCart(item)}
          hapticPattern="light"
          style={{ paddingHorizontal: spacing[4], paddingVertical: spacing[1] }}
        >
          <Card
            style={
              inCart
                ? { borderWidth: 2, borderColor: colors.primary }
                : undefined
            }
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
                  backgroundColor: inCart
                    ? colors.primary
                    : colors.primaryLight,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {inCart ? (
                  <Text
                    style={{
                      ...typePresets.bodySmall,
                      color: colors.textInverse,
                      fontWeight: '700',
                    }}
                  >
                    {qty}
                  </Text>
                ) : (
                  <Package size={20} color={colors.primary} />
                )}
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
                  {item.name}
                </Text>
                <Text
                  style={{
                    ...typePresets.caption,
                    color: colors.textSecondary,
                  }}
                >
                  {item.sku} | Stock: {item.current_stock} {item.unit}
                </Text>
              </View>
              <StockLevelIndicator
                currentStock={item.current_stock}
                minStock={item.min_stock}
                maxStock={item.max_stock ?? undefined}
              />
            </View>
          </Card>
        </AnimatedPressable>
      );
    },
    [cart, colors, spacing, radii, typePresets, handleAddToCart],
  );

  // --- List header component ---

  const listHeader = useMemo(() => {
    if (isSearching) return null;

    const sectionTitle = selectedCategory
      ? selectedCategory
      : `All Items (${itemCount})`;

    return (
      <View style={{ gap: spacing[2] }}>
        {!selectedCategory && lowStockItems.length > 0 && (
          <LowStockSection
            items={lowStockItems}
            onItemPress={handleLowStockPress}
          />
        )}
        <SectionHeader title={sectionTitle} />
      </View>
    );
  }, [isSearching, selectedCategory, itemCount, lowStockItems, spacing, handleLowStockPress]);

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: screenColors.scan }}
      edges={['top']}
    >
      <ScreenHeader
        title="Stock Transaction"
        headerColor={screenColors.scan}
        rightAction={
          <AnimatedPressable
            onPress={handleToggleScanner}
            hapticPattern="light"
          >
            <ScanLine
              size={24}
              color={scanning ? '#fff' : 'rgba(255,255,255,0.7)'}
            />
          </AnimatedPressable>
        }
      />

      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <TransactionTypeToggle
          value={transactionType}
          onChange={setTransactionType}
        />

        <View
          style={{
            paddingHorizontal: spacing[4],
            marginBottom: spacing[2],
          }}
        >
          <Input
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by name, SKU, or barcode"
            icon={<Search size={20} color={colors.iconSecondary} />}
          />
        </View>

        {!isSearching && categories.length > 0 && (
          <View style={{ marginBottom: spacing[2] }}>
            <CategoryChipBar
              categories={categories}
              selected={selectedCategory}
              onSelect={setSelectedCategory}
            />
          </View>
        )}

        {scanning && permission?.granted && (
          <View
            style={{
              height: 200,
              marginHorizontal: spacing[4],
              borderRadius: radii.lg,
              overflow: 'hidden',
              marginBottom: spacing[3],
            }}
          >
            <CameraView
              style={{ flex: 1 }}
              barcodeScannerSettings={{
                barcodeTypes: [
                  'qr',
                  'ean13',
                  'ean8',
                  'code128',
                  'code39',
                  'upc_a',
                  'upc_e',
                ],
              }}
              onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
            />
            {/* Scanner overlay */}
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <View
                style={{
                  width: 160,
                  height: 160,
                  borderWidth: 2,
                  borderColor: colors.primary,
                  borderRadius: radii.lg,
                }}
              />
            </View>
          </View>
        )}

        <FlatList
          ref={listRef}
          data={displayedItems}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          initialNumToRender={10}
          maxToRenderPerBatch={5}
          windowSize={5}
          removeClippedSubviews={true}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            isSearching ? (
              <View
                style={{
                  alignItems: 'center',
                  padding: spacing[8],
                  gap: spacing[3],
                }}
              >
                <Package size={48} color={colors.textTertiary} />
                <Text
                  style={{ ...typePresets.body, color: colors.textSecondary }}
                >
                  No items found
                </Text>
              </View>
            ) : (
              <View
                style={{
                  alignItems: 'center',
                  padding: spacing[8],
                  gap: spacing[3],
                }}
              >
                <Package size={48} color={colors.textTertiary} />
                <Text
                  style={{ ...typePresets.body, color: colors.textSecondary }}
                >
                  No items in cache yet
                </Text>
                <Text
                  style={{ ...typePresets.caption, color: colors.textTertiary }}
                >
                  Items will appear after first sync
                </Text>
              </View>
            )
          }
          contentContainerStyle={{
            paddingBottom: cartItemCount > 0 ? 80 : spacing[4],
          }}
          keyboardShouldPersistTaps="handled"
          onScrollToIndexFailed={(info) => {
            // Fallback: scroll to approximate offset
            listRef.current?.scrollToOffset({
              offset: info.averageItemLength * info.index,
              animated: true,
            });
          }}
        />

        {reviewVisible && (
          <CartReviewSheet
            visible={reviewVisible}
            cart={cart}
            transactionType={transactionType}
            onChangeTransactionType={setTransactionType}
            onUpdateQuantity={handleUpdateQuantity}
            onUpdateNotes={handleUpdateNotes}
            onRemoveItem={handleRemoveFromCart}
            onConfirm={handleConfirmBatch}
            onClose={() => setReviewVisible(false)}
            submitting={submitting}
          />
        )}

        {cartItemCount > 0 && !reviewVisible && (
          <CartSummaryBar
            itemCount={cartItemCount}
            totalQuantity={cartTotalQty}
            onReview={() => setReviewVisible(true)}
            onClear={handleClearCart}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
