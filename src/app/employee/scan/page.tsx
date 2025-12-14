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
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/Modal";
import { ItemImage } from "@/components/items";
import { BarcodeScanner, ScanSuccessOverlay } from "@/components/scanner";
import { BatchMiniList } from "@/components/batch";
import { useBatchScan } from "@/contexts/BatchScanContext";
import { useScanFeedback } from "@/hooks";
import { searchItems, getItemBySku, getItemByBarcode, getItems } from "@/lib/actions";
import type { Item } from "@/lib/supabase/types";

type ScanMode = "camera" | "manual";
type TransactionType = "check_in" | "check_out";

export default function ScanPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const modeParam = searchParams.get("mode");
  const typeParam = searchParams.get("type") as TransactionType | null;

  // Batch scan context
  const {
    items: batchItems,
    transactionType: batchTransactionType,
    addItem,
    incrementItem,
    removeItem,
    setTransactionType,
    hasItem,
    totalItems,
  } = useBatchScan();

  // Transaction type from dashboard (default to check_in)
  const transactionType: TransactionType = typeParam === "check_out" ? "check_out" : "check_in";

  // Sync transaction type to context on mount/change
  React.useEffect(() => {
    setTransactionType(transactionType === "check_out" ? "out" : "in");
  }, [transactionType, setTransactionType]);

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

  // Duplicate confirmation modal state
  const [duplicateItem, setDuplicateItem] = React.useState<Item | null>(null);
  const [showDuplicateModal, setShowDuplicateModal] = React.useState(false);

  // Scan feedback (audio, haptic, visual)
  const { triggerFeedback, triggerDuplicateAlert, clearFeedback, feedbackItem, isVisible, isExiting } = useScanFeedback();

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

  // Add item to batch
  const addItemToBatch = React.useCallback((item: Item) => {
    const wasAdded = addItem(item);
    if (wasAdded) {
      triggerFeedback({ itemName: item.name, itemImageUrl: item.image_url });
      setError(null);
    } else {
      // Item already exists - clear any visible overlay and show confirmation
      clearFeedback();
      triggerDuplicateAlert();
      setDuplicateItem(item);
      setShowDuplicateModal(true);
    }
  }, [addItem, triggerFeedback, triggerDuplicateAlert, clearFeedback]);

  // Handle duplicate confirmation
  const handleDuplicateConfirm = () => {
    if (duplicateItem) {
      incrementItem(duplicateItem.id);
      triggerFeedback({ itemName: duplicateItem.name, itemImageUrl: duplicateItem.image_url });
    }
    setShowDuplicateModal(false);
    setDuplicateItem(null);
  };

  const handleDuplicateCancel = () => {
    setShowDuplicateModal(false);
    setDuplicateItem(null);
  };

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
        addItemToBatch(barcodeResult.data);
        setIsLookingUp(false);
        return;
      }

      // Try to find by SKU
      const skuResult = await getItemBySku(code);
      if (skuResult.success && skuResult.data) {
        addItemToBatch(skuResult.data);
        setIsLookingUp(false);
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
  }, [isLookingUp, addItemToBatch]);

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
        addItemToBatch(skuResult.data);
        setManualCode("");
        setIsSearching(false);
        return;
      }

      // Try to find by barcode (exact match)
      const barcodeResult = await getItemByBarcode(manualCode.trim());
      if (barcodeResult.success && barcodeResult.data) {
        addItemToBatch(barcodeResult.data);
        setManualCode("");
        setIsSearching(false);
        return;
      }

      // Search by name/sku/barcode (partial match)
      const searchResult = await searchItems(manualCode.trim());
      if (searchResult.success && searchResult.data && searchResult.data.length > 0) {
        if (searchResult.data.length === 1) {
          // Single match - add directly to batch
          addItemToBatch(searchResult.data[0]);
          setManualCode("");
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
    addItemToBatch(item);
    setSearchResults([]);
    setManualCode("");
  };

  // Navigate to batch review page
  const handleDoneScanning = () => {
    router.push("/employee/batch-review");
  };

  // Gradient background based on transaction type
  const gradientClass = transactionType === "check_in"
    ? "before:from-[rgba(40,167,69,0.15)] before:via-[rgba(40,167,69,0.05)]"
    : "before:from-[rgba(220,53,69,0.15)] before:via-[rgba(220,53,69,0.05)]";

  return (
    <div className={`relative flex flex-col h-full before:absolute before:inset-0 before:bg-gradient-to-b ${gradientClass} before:via-30% before:to-transparent before:to-50% before:pointer-events-none before:-z-10`}>
      {/* Transaction Type Badge */}
      <div className="flex items-center justify-center mb-4">
        <Badge
          colorScheme={transactionType === "check_in" ? "success" : "error"}
          variant="solid"
          size="lg"
        >
          {transactionType === "check_in" ? "CHECK IN" : "CHECK OUT"}
        </Badge>
      </div>

      {/* Scan Mode Toggle */}
      <div className="flex bg-neutral-100 rounded-xl p-1 mb-4">
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

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto space-y-4">
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
              <div className="text-center py-2">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary rounded-full text-sm">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  Looking up item...
                </div>
              </div>
            )}

            {/* Error display */}
            {error && !isLookingUp && (
              <Alert status="error" variant="subtle">
                <AlertCircle className="w-4 h-4" />
                {error}
              </Alert>
            )}

            {/* Batch Mini List */}
            <div className="bg-neutral-50 rounded-xl p-3">
              <BatchMiniList
                items={batchItems}
                onRemove={removeItem}
                maxVisibleItems={3}
              />
            </div>
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
                  Add to List
                </Button>
              </CardBody>
            </Card>

            {/* Batch Mini List in Manual Mode */}
            {batchItems.length > 0 && (
              <div className="bg-neutral-50 rounded-xl p-3">
                <BatchMiniList
                  items={batchItems}
                  onRemove={removeItem}
                  maxVisibleItems={3}
                />
              </div>
            )}

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
                          <div className="flex items-center gap-2">
                            <Badge colorScheme="neutral" size="sm">
                              {item.current_stock} {item.unit}
                            </Badge>
                            {hasItem(item.id) && (
                              <Badge colorScheme="success" size="sm">
                                In list
                              </Badge>
                            )}
                          </div>
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
                            <div className="flex items-center gap-2">
                              <Badge colorScheme="neutral" size="sm">
                                {item.current_stock} {item.unit}
                              </Badge>
                              {hasItem(item.id) && (
                                <Badge colorScheme="success" size="sm">
                                  In list
                                </Badge>
                              )}
                            </div>
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

      {/* Fixed Bottom Button */}
      <div className="pt-4 mt-auto">
        <Button
          variant="cta"
          isFullWidth
          size="lg"
          onClick={handleDoneScanning}
          disabled={totalItems === 0}
        >
          Done Scanning ({totalItems} item{totalItems !== 1 ? "s" : ""})
        </Button>
      </div>

      {/* Duplicate Confirmation Modal */}
      <Modal
        isOpen={showDuplicateModal}
        onClose={handleDuplicateCancel}
        size="sm"
      >
        <ModalHeader showCloseButton onClose={handleDuplicateCancel}>
          Item Already in List
        </ModalHeader>
        <ModalBody>
          <div className="text-center">
            {duplicateItem && (
              <>
                <div className="flex justify-center mb-4">
                  <ItemImage
                    imageUrl={duplicateItem.image_url}
                    itemName={duplicateItem.name}
                    size="lg"
                  />
                </div>
                <p className="font-medium text-foreground mb-1">
                  {duplicateItem.name}
                </p>
                <p className="text-sm text-foreground-muted mb-4">
                  This item is already in your scan list.
                </p>
              </>
            )}
            <p className="text-sm text-foreground">
              Would you like to add another unit?
            </p>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={handleDuplicateCancel}>
            No
          </Button>
          <Button variant="primary" onClick={handleDuplicateConfirm}>
            Yes, Add Another
          </Button>
        </ModalFooter>
      </Modal>

      {/* Scan Success Overlay (audio, haptic, visual feedback) */}
      <ScanSuccessOverlay
        item={feedbackItem}
        isVisible={isVisible}
        isExiting={isExiting}
      />
    </div>
  );
}
