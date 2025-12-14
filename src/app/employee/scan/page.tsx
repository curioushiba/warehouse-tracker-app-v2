"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Camera,
  Package,
  AlertCircle,
  Search,
} from "lucide-react";
import {
  Card,
  CardBody,
  Button,
  SearchInput,
  Badge,
  Alert,
  Skeleton,
} from "@/components/ui";
import { ItemImage } from "@/components/items";
import { BarcodeScanner } from "@/components/scanner";
import { searchItems, getItemBySku, getItemByBarcode, getItems } from "@/lib/actions";
import type { Item } from "@/lib/supabase/types";

type ScanMode = "camera" | "manual";
type TransactionType = "check_in" | "check_out";

export default function ScanPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const modeParam = searchParams.get("mode");
  const typeParam = searchParams.get("type") as TransactionType | null;

  // Transaction type from dashboard (default to check_in)
  const transactionType: TransactionType = typeParam === "check_out" ? "check_out" : "check_in";

  // Initialize scan mode from URL param (manual) or default to camera
  const [scanMode, setScanMode] = React.useState<ScanMode>(
    modeParam === "manual" ? "manual" : "camera"
  );
  const [manualCode, setManualCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isLookingUp, setIsLookingUp] = React.useState(false);
  const [recentItems, setRecentItems] = React.useState<Item[]>([]);
  const [isLoadingRecent, setIsLoadingRecent] = React.useState(true);
  const [isSearching, setIsSearching] = React.useState(false);
  const [searchResults, setSearchResults] = React.useState<Item[]>([]);

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

  // Navigate to transaction page with item and type
  const navigateToTransaction = React.useCallback((itemId: string) => {
    router.push(`/employee/transaction?itemId=${itemId}&type=${transactionType}`);
  }, [router, transactionType]);

  // Handle barcode scan from camera
  const handleCodeScanned = React.useCallback(async (code: string) => {
    // Prevent multiple lookups
    if (isLookingUp) return;

    setIsLookingUp(true);
    setError(null);

    try {
      // Try to find by barcode first
      const barcodeResult = await getItemByBarcode(code);
      if (barcodeResult.success && barcodeResult.data) {
        navigateToTransaction(barcodeResult.data.id);
        return;
      }

      // Try to find by SKU
      const skuResult = await getItemBySku(code);
      if (skuResult.success && skuResult.data) {
        navigateToTransaction(skuResult.data.id);
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
  }, [isLookingUp, navigateToTransaction]);

  // Handle scanner errors
  const handleScannerError = React.useCallback((errorMessage: string) => {
    console.error("Scanner error:", errorMessage);
    setError(errorMessage);
  }, []);

  const handleManualSearch = async () => {
    if (!manualCode.trim()) return;

    setError(null);
    setIsSearching(true);
    setSearchResults([]);

    try {
      // Try to find by SKU first (exact match)
      const skuResult = await getItemBySku(manualCode.trim());
      if (skuResult.success && skuResult.data) {
        navigateToTransaction(skuResult.data.id);
        setIsSearching(false);
        return;
      }

      // Try to find by barcode (exact match)
      const barcodeResult = await getItemByBarcode(manualCode.trim());
      if (barcodeResult.success && barcodeResult.data) {
        navigateToTransaction(barcodeResult.data.id);
        setIsSearching(false);
        return;
      }

      // Search by name/sku/barcode (partial match)
      const searchResult = await searchItems(manualCode.trim());
      if (searchResult.success && searchResult.data && searchResult.data.length > 0) {
        if (searchResult.data.length === 1) {
          // Single match - go directly to transaction
          navigateToTransaction(searchResult.data[0].id);
        } else {
          // Multiple matches - show results list
          setSearchResults(searchResult.data);
        }
        setIsSearching(false);
        return;
      }

      setError("Item not found. Please check the search term and try again.");
    } catch (err) {
      setError("Search failed. Please try again.");
      console.error("Search error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle item selection from list
  const handleItemSelect = (item: Item) => {
    navigateToTransaction(item.id);
  };

  return (
    <div className="space-y-6">
      {/* Scan Mode Toggle */}
      <div className="flex bg-neutral-100 rounded-xl p-1">
        <button
          onClick={() => {
            setScanMode("camera");
            setError(null);
            setSearchResults([]);
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all ${scanMode === "camera"
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
            setError(null);
            setSearchResults([]);
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all ${scanMode === "manual"
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
              <AlertCircle className="w-4 h-4" />
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
                  Find Item
                </h3>
                <p className="text-sm text-foreground-muted mt-1">
                  Enter SKU, barcode, or item name
                </p>
              </div>

              <SearchInput
                placeholder="Enter SKU, barcode, or name"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onClear={() => {
                  setManualCode("");
                  setSearchResults([]);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleManualSearch();
                  }
                }}
              />

              {error && (
                <Alert status="error" variant="subtle">
                  <AlertCircle className="w-4 h-4" />
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

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-foreground-muted uppercase tracking-wider mb-3">
                Search Results ({searchResults.length})
              </h3>
              <div className="space-y-2">
                {searchResults.map((item) => (
                  <Card
                    key={item.id}
                    variant="outline"
                    isHoverable
                    className="cursor-pointer"
                    onClick={() => handleItemSelect(item)}
                  >
                    <CardBody className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <ItemImage
                            imageUrl={item.image_url}
                            itemName={item.name}
                            size="sm"
                          />
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
                ))}
              </div>
            </div>
          )}

          {/* Quick Select (Recent Items) - only show if no search results */}
          {searchResults.length === 0 && (
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
                      onClick={() => handleItemSelect(item)}
                    >
                      <CardBody className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <ItemImage
                              imageUrl={item.image_url}
                              itemName={item.name}
                              size="sm"
                            />
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
          )}
        </>
      )}
    </div>
  );
}
