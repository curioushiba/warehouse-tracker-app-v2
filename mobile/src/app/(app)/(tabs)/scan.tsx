import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, FlatList, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
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
  Camera,
  Package,
  ChevronRight,
} from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeContext';
import {
  getCachedItemByBarcode,
  getCachedItemBySku,
  searchCachedItems,
} from '@/lib/db/operations';
import type { CachedItem } from '@/lib/db/types';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { StockLevelIndicator } from '@/components/indicators/StockLevelIndicator';
import { haptic } from '@/lib/haptics';

export default function ScanScreen() {
  const db = useSQLiteContext();
  const params = useLocalSearchParams<{ type?: string }>();
  const { colors, spacing, typePresets, radii } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CachedItem[]>([]);
  const [scanning, setScanning] = useState(true);
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      const results = searchCachedItems(db, searchQuery.trim());
      setSearchResults(results.filter((item) => !item.is_archived));
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, db]);

  const navigateToTransaction = useCallback(
    (itemId: string) => {
      haptic('medium');
      const txType = params.type ?? 'in';
      router.push({
        pathname: '/(app)/transaction/[id]',
        params: { id: itemId, type: txType },
      });
    },
    [params.type],
  );

  const handleBarcodeScanned = useCallback(
    (result: BarcodeScanningResult) => {
      if (scanned) return;
      setScanned(true);
      haptic('success');

      const code = result.data;
      const item =
        getCachedItemByBarcode(db, code) ?? getCachedItemBySku(db, code);

      if (item) {
        navigateToTransaction(item.id);
      } else {
        Alert.alert(
          'Item Not Found',
          `No item found with barcode "${code}". Try searching manually.`,
          [{ text: 'OK', onPress: () => setScanned(false) }],
        );
      }
    },
    [db, scanned, navigateToTransaction],
  );

  const renderSearchResult = useCallback(
    ({ item }: { item: CachedItem }) => (
      <AnimatedPressable
        onPress={() => navigateToTransaction(item.id)}
        hapticPattern="light"
        style={{ paddingHorizontal: spacing[4], paddingVertical: spacing[1] }}
      >
        <Card>
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
                backgroundColor: colors.primaryLight,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Package size={20} color={colors.primary} />
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
                style={{ ...typePresets.caption, color: colors.textSecondary }}
              >
                {item.sku} | Stock: {item.current_stock} {item.unit}
              </Text>
            </View>
            <StockLevelIndicator
              currentStock={item.current_stock}
              minStock={item.min_stock}
              maxStock={item.max_stock ?? undefined}
            />
            <ChevronRight size={16} color={colors.textTertiary} />
          </View>
        </Card>
      </AnimatedPressable>
    ),
    [colors, spacing, radii, typePresets, navigateToTransaction],
  );

  // Permission not yet determined
  if (!permission) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: colors.background }}
        edges={['top']}
      >
        <ScreenHeader title="Scan" />
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ ...typePresets.body, color: colors.textSecondary }}>
            Loading camera...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Permission denied
  if (!permission.granted) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: colors.background }}
        edges={['top']}
      >
        <ScreenHeader title="Scan" />
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: spacing[6],
            gap: spacing[4],
          }}
        >
          <Camera size={48} color={colors.textTertiary} />
          <Text
            style={{
              ...typePresets.body,
              color: colors.textSecondary,
              textAlign: 'center',
            }}
          >
            Camera permission is required to scan barcodes
          </Text>
          <Button
            title="Grant Permission"
            onPress={requestPermission}
            variant="primary"
          />
        </View>

        {/* Manual search fallback */}
        <View style={{ padding: spacing[4] }}>
          <Input
            label="Manual Search"
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by name, SKU, or barcode"
            icon={<Search size={20} color={colors.iconSecondary} />}
          />
        </View>
        {searchResults.length > 0 && (
          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.id}
            renderItem={renderSearchResult}
            contentContainerStyle={{ paddingBottom: spacing[4] }}
          />
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={['top']}
    >
      <ScreenHeader
        title="Scan"
        rightAction={
          <AnimatedPressable
            onPress={() => setScanning((prev) => !prev)}
            hapticPattern="light"
          >
            <ScanLine
              size={24}
              color={scanning ? colors.primary : colors.textTertiary}
            />
          </AnimatedPressable>
        }
      />

      {/* Search Bar */}
      <View style={{ paddingHorizontal: spacing[4], marginBottom: spacing[3] }}>
        <Input
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search by name, SKU, or barcode"
          icon={<Search size={20} color={colors.iconSecondary} />}
        />
      </View>

      {searchQuery.trim().length >= 2 ? (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id}
          renderItem={renderSearchResult}
          ListEmptyComponent={
            <View
              style={{
                alignItems: 'center',
                padding: spacing[8],
              }}
            >
              <Text
                style={{ ...typePresets.body, color: colors.textSecondary }}
              >
                No items found
              </Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: spacing[4] }}
        />
      ) : (
        <>
          {/* Camera Scanner */}
          {scanning && (
            <View
              style={{
                height: 250,
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
                    width: 200,
                    height: 200,
                    borderWidth: 2,
                    borderColor: colors.primary,
                    borderRadius: radii.lg,
                  }}
                />
              </View>
            </View>
          )}

          {scanned && (
            <View style={{ paddingHorizontal: spacing[4], marginBottom: spacing[3] }}>
              <Button
                title="Scan Again"
                onPress={() => setScanned(false)}
                variant="secondary"
                icon={<ScanLine size={20} color={colors.text} />}
              />
            </View>
          )}

          <View
            style={{
              alignItems: 'center',
              padding: spacing[4],
            }}
          >
            <Text
              style={{ ...typePresets.bodySmall, color: colors.textTertiary }}
            >
              Point camera at a barcode or search manually
            </Text>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}
