"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Camera,
  Package,
  AlertCircle,
  CheckCircle2,
  Search,
} from "lucide-react";
import {
  Card,
  CardBody,
  Button,
  SearchInput,
  Badge,
  Alert,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Skeleton,
} from "@/components/ui";
import { StockLevelBadge } from "@/components/ui";
import { BarcodeScanner } from "@/components/scanner";
import { searchItems, getItemBySku, getItemByBarcode, getItems } from "@/lib/actions";
import type { Item } from "@/lib/supabase/types";
import { getStockLevel, formatCurrency } from "@/lib/utils";

type ScanMode = "camera" | "manual";

interface ScannedItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  unit: string;
  costPrice: number;
  location: string;
}

export default function ScanPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const modeParam = searchParams.get("mode");

  // Initialize scan mode from URL param (manual) or default to camera
  const [scanMode, setScanMode] = React.useState<ScanMode>(
    modeParam === "manual" ? "manual" : "camera"
  );
  const [manualCode, setManualCode] = React.useState("");
  const [scannedItem, setScannedItem] = React.useState<ScannedItem | null>(null);
  const [showResult, setShowResult] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isLookingUp, setIsLookingUp] = React.useState(false);
  const [recentItems, setRecentItems] = React.useState<Item[]>([]);
  const [isLoadingRecent, setIsLoadingRecent] = React.useState(true);
  const [isSearching, setIsSearching] = React.useState(false);

  // Fetch recent items on mount
  React.useEffect(() => {
    async function fetchRecentItems() {
      try {
        setIsLoadingRecent(true);
        const result = await getItems({ isArchived: false });
        if (result.success && result.data) {
          setRecentItems(result.data.slice(0, 4));
        }
      } catch (err) {
        console.error("Failed to fetch recent items:", err);
      } finally {
        setIsLoadingRecent(false);
      }
    }
    fetchRecentItems();
  }, []);

  // Handle barcode scan from camera
  const handleCodeScanned = React.useCallback(async (code: string) => {
    // Prevent multiple lookups
    if (isLookingUp || showResult) return;

    setIsLookingUp(true);
    setError(null);

    try {
      // Try to find by barcode first
      const barcodeResult = await getItemByBarcode(code);
      if (barcodeResult.success && barcodeResult.data) {
        handleItemFound(barcodeResult.data);
        return;
      }

      // Try to find by SKU
      const skuResult = await getItemBySku(code);
      if (skuResult.success && skuResult.data) {
        handleItemFound(skuResult.data);
        return;
      }

      // Not found
      setError(`Item not found for code: ${code}`);
    } catch (err) {
      console.error("Error looking up item:", err);
      setError("Failed to look up item. Please try again.");
    } finally {
      setIsLookingUp(false);
    }
  }, [isLookingUp, showResult]);

  // Handle scanner errors
  const handleScannerError = React.useCallback((errorMessage: string) => {
    console.error("Scanner error:", errorMessage);
    setError(errorMessage);
  }, []);

  const handleManualSearch = async () => {
    if (!manualCode.trim()) return;

    setError(null);
    setIsSearching(true);

    try {
      // Try to find by SKU first
      const skuResult = await getItemBySku(manualCode.trim());
      if (skuResult.success && skuResult.data) {
        handleItemFound(skuResult.data);
        setIsSearching(false);
        return;
      }

      // Try to find by barcode
      const barcodeResult = await getItemByBarcode(manualCode.trim());
      if (barcodeResult.success && barcodeResult.data) {
        handleItemFound(barcodeResult.data);
        setIsSearching(false);
        return;
      }

      // Try search
      const searchResult = await searchItems(manualCode.trim());
      if (searchResult.success && searchResult.data && searchResult.data.length > 0) {
        handleItemFound(searchResult.data[0]);
        setIsSearching(false);
        return;
      }

      setError("Item not found. Please check the code and try again.");
    } catch (err) {
      setError("Search failed. Please try again.");
      console.error("Search error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleItemFound = (item: Item) => {
    setScannedItem({
      id: item.id,
      name: item.name,
      sku: item.sku,
      category: item.category_id ?? "Uncategorized",
      currentStock: item.current_stock,
      minStock: item.min_stock ?? 0,
      maxStock: item.max_stock ?? 100,
      unit: item.unit,
      costPrice: item.unit_price ?? 0,
      location: item.location_id ?? "",
    });
    setShowResult(true);
    setIsLookingUp(false);
  };

  const handleProceedToTransaction = (type: "check_in" | "check_out") => {
    if (scannedItem) {
      router.push(
        `/employee/transaction?itemId=${scannedItem.id}&type=${type}`
      );
    }
  };

  const handleScanAgain = () => {
    setScannedItem(null);
    setShowResult(false);
    setError(null);
    setManualCode("");
    setIsLookingUp(false);
  };

  const stockLevel = scannedItem
    ? getStockLevel(
        scannedItem.currentStock,
        scannedItem.minStock,
        scannedItem.maxStock
      )
    : "normal";

  return (
    <div className="space-y-6">
      {/* Scan Mode Toggle */}
      <div className="flex bg-neutral-100 rounded-xl p-1">
        <button
          onClick={() => {
            setScanMode("camera");
            setError(null); // Clear any existing errors when switching modes
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all ${
            scanMode === "camera"
              ? "bg-white text-foreground shadow-sm"
              : "text-foreground-muted"
          }`}
        >
          <Camera className="w-5 h-5" />
          Camera
        </button>
        <button
          onClick={() => {
            setScanMode("manual");
            setError(null); // Clear any existing errors when switching modes
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all ${
            scanMode === "manual"
              ? "bg-white text-foreground shadow-sm"
              : "text-foreground-muted"
          }`}
        >
          <Search className="w-5 h-5" />
          Manual
        </button>
      </div>

      {scanMode === "camera" ? (
        <>
          {/* Real Barcode Scanner */}
          <BarcodeScanner
            onScan={handleCodeScanned}
            onError={handleScannerError}
            enableTorch
            aspectRatio={1}
          />

          {/* Loading indicator when looking up item */}
          {isLookingUp && (
            <div className="text-center py-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary rounded-full">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                Looking up item...
              </div>
            </div>
          )}

          {/* Error display */}
          {error && !isLookingUp && (
            <Alert status="error" variant="subtle" className="mt-4">
              {error}
            </Alert>
          )}
        </>
      ) : (
        <>
          {/* Manual Entry */}
          <Card variant="elevated">
            <CardBody className="space-y-4">
              <div className="text-center mb-4">
                <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Package className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-heading font-semibold text-foreground">
                  Enter Item Code
                </h3>
                <p className="text-sm text-foreground-muted mt-1">
                  Type the SKU or scan code manually
                </p>
              </div>

              <SearchInput
                placeholder="Enter SKU (e.g., SKU-001)"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onClear={() => setManualCode("")}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleManualSearch();
                  }
                }}
              />

              {error && (
                <Alert status="error" variant="subtle">
                  {error}
                </Alert>
              )}

              <Button
                variant="primary"
                isFullWidth
                size="lg"
                onClick={handleManualSearch}
                disabled={!manualCode.trim() || isSearching}
                isLoading={isSearching}
              >
                Search Item
              </Button>
            </CardBody>
          </Card>

          {/* Quick Select (Recent Items) */}
          <div>
            <h3 className="text-sm font-semibold text-foreground-muted uppercase tracking-wider mb-3">
              Recent Items
            </h3>
            <div className="space-y-2">
              {isLoadingRecent ? (
                <>
                  {[1, 2, 3, 4].map((i) => (
                    <Card key={i} variant="outline">
                      <CardBody className="p-3">
                        <Skeleton className="h-10 w-full" />
                      </CardBody>
                    </Card>
                  ))}
                </>
              ) : recentItems.length === 0 ? (
                <div className="text-center py-6 text-foreground-muted">
                  No items in inventory
                </div>
              ) : (
                recentItems.map((item) => (
                  <Card
                    key={item.id}
                    variant="outline"
                    isHoverable
                    className="cursor-pointer"
                    onClick={() => handleItemFound(item)}
                  >
                    <CardBody className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                            <Package className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground text-sm">
                              {item.name}
                            </p>
                            <p className="text-xs text-foreground-muted">
                              {item.sku}
                            </p>
                          </div>
                        </div>
                        <Badge colorScheme="neutral" size="sm">
                          {item.current_stock} {item.unit}
                        </Badge>
                      </div>
                    </CardBody>
                  </Card>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* Scanned Item Result Modal */}
      <Modal
        isOpen={showResult}
        onClose={() => setShowResult(false)}
        size="lg"
      >
        <ModalHeader showCloseButton onClose={() => setShowResult(false)}>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-success" />
            Item Found
          </div>
        </ModalHeader>
        <ModalBody>
          {scannedItem && (
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-primary-50 rounded-xl flex items-center justify-center shrink-0">
                  <Package className="w-8 h-8 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-heading font-semibold text-foreground text-lg">
                    {scannedItem.name}
                  </h3>
                  <p className="text-sm text-foreground-muted">
                    {scannedItem.sku}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge colorScheme="neutral" size="sm">
                      {scannedItem.category}
                    </Badge>
                    <StockLevelBadge level={stockLevel} size="sm" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-neutral-50 rounded-xl p-3">
                  <p className="text-xs text-foreground-muted mb-1">
                    Current Stock
                  </p>
                  <p className="font-semibold text-foreground">
                    {scannedItem.currentStock} {scannedItem.unit}
                  </p>
                </div>
                <div className="bg-neutral-50 rounded-xl p-3">
                  <p className="text-xs text-foreground-muted mb-1">
                    Max Stock
                  </p>
                  <p className="font-semibold text-foreground">
                    {scannedItem.maxStock} {scannedItem.unit}
                  </p>
                </div>
                <div className="bg-neutral-50 rounded-xl p-3">
                  <p className="text-xs text-foreground-muted mb-1">
                    Unit Cost
                  </p>
                  <p className="font-semibold text-foreground">
                    {formatCurrency(scannedItem.costPrice)}
                  </p>
                </div>
                <div className="bg-neutral-50 rounded-xl p-3">
                  <p className="text-xs text-foreground-muted mb-1">
                    Min Stock
                  </p>
                  <p className="font-semibold text-foreground">
                    {scannedItem.minStock} {scannedItem.unit}
                  </p>
                </div>
              </div>

              {stockLevel === "critical" && (
                <Alert status="error" variant="subtle">
                  <AlertCircle className="w-4 h-4" />
                  Critical stock level. Consider restocking soon.
                </Alert>
              )}

              {stockLevel === "low" && (
                <Alert status="warning" variant="subtle">
                  <AlertCircle className="w-4 h-4" />
                  Low stock level. Monitor inventory.
                </Alert>
              )}
            </div>
          )}
        </ModalBody>
        <ModalFooter className="flex-col gap-3">
          <div className="grid grid-cols-2 gap-3 w-full">
            <Button
              variant="primary"
              size="lg"
              onClick={() => handleProceedToTransaction("check_in")}
              className="w-full"
            >
              Check In
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => handleProceedToTransaction("check_out")}
              className="w-full"
            >
              Check Out
            </Button>
          </div>
          <Button
            variant="ghost"
            size="md"
            onClick={handleScanAgain}
            isFullWidth
          >
            Scan Another Item
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
