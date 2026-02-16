"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Package,
  AlertTriangle,
} from "lucide-react";
import { Button, Badge, Alert } from "@/components/ui";
import { BatchItemRow, BatchConfirmModal } from "@/components/batch";
import { useBatchScan } from "@/contexts/BatchScanContext";
import { useSyncQueue } from "@/hooks/useSyncQueue";
import { useAuthContext } from "@/contexts/AuthContext";

export default function BatchReviewPage() {
  const router = useRouter();
  const { queueTransaction, isOnline } = useSyncQueue();
  const { isAuthenticated } = useAuthContext();
  const {
    items: batchItems,
    transactionType,
    updateQuantity,
    removeItem,
    removeItems,
    clearBatch,
    totalItems,
    totalUnits,
  } = useBatchScan();

  const [showConfirmModal, setShowConfirmModal] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitProgress, setSubmitProgress] = React.useState({ current: 0, total: 0 });
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [failedItems, setFailedItems] = React.useState<string[]>([]);

  // Map batch transaction type to API transaction type
  const apiTransactionType = transactionType === "in" ? "check_in" : "check_out";
  const isCheckOut = transactionType === "out";

  // Check if any items exceed available stock (for check_out)
  const hasStockExceeded = isCheckOut && batchItems.some(
    (item) => item.quantity > item.item.current_stock
  );

  // Handle back navigation
  const handleBack = () => {
    router.push(`/employee/scan?type=${apiTransactionType}`);
  };

  // Handle quantity change
  const handleQuantityChange = (itemId: string, quantity: number) => {
    updateQuantity(itemId, quantity);
    setSubmitError(null);
    setFailedItems([]);
  };

  // Handle item removal
  const handleRemove = (itemId: string) => {
    removeItem(itemId);
    setSubmitError(null);
    setFailedItems((prev) => prev.filter((id) => id !== itemId));
  };

  // Show confirmation modal
  const handleSubmitClick = () => {
    if (hasStockExceeded) {
      setSubmitError("Some items exceed available stock. Please adjust quantities.");
      return;
    }
    setShowConfirmModal(true);
  };

  // Queue all batch items - they will sync immediately if online,
  // or be queued for later sync if offline. The queue handles retries.
  const handleConfirmSubmit = async () => {
    if (!isAuthenticated) {
      setIsSubmitting(false);
      setSubmitError("Your session has expired. Please log in again.");
      router.push("/employee/login");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setFailedItems([]);
    setSubmitProgress({ current: 0, total: batchItems.length });

    const newFailedItems: string[] = [];

    try {
      // Queue all items - this is a fast local operation
      for (let i = 0; i < batchItems.length; i++) {
        const batchItem = batchItems[i];
        try {
          await queueTransaction({
            transactionType: apiTransactionType,
            itemId: batchItem.itemId,
            quantity: batchItem.quantity,
            deviceTimestamp: new Date().toISOString(),
          });
          setSubmitProgress({ current: i + 1, total: batchItems.length });
        } catch (err) {
          console.error(`Failed to queue transaction for ${batchItem.item.name}:`, err);
          newFailedItems.push(batchItem.itemId);
        }
      }

      setIsSubmitting(false);
      setShowConfirmModal(false);

      if (newFailedItems.length > 0) {
        // Some items failed to queue - keep them for retry
        const successfulItems = batchItems
          .filter((item) => !newFailedItems.includes(item.itemId))
          .map((item) => item.itemId);
        if (successfulItems.length > 0) {
          removeItems(successfulItems);
        }
        setFailedItems(newFailedItems);
        setSubmitError(
          `${newFailedItems.length} item(s) failed to queue. ${successfulItems.length} queued successfully.`
        );
      } else {
        // All items queued successfully - clear batch and navigate home
        // The queue will handle syncing in the background
        clearBatch();
        router.push("/employee?batchSuccess=" + totalItems);
      }
    } catch (err) {
      setIsSubmitting(false);
      setShowConfirmModal(false);
      setSubmitError("Failed to queue transactions. Please try again.");
      console.error("Batch queue error:", err);
    }
  };

  // Handle empty state
  if (batchItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12">
        <Package className="w-16 h-16 text-foreground-muted mb-4" />
        <h2 className="text-lg font-semibold text-foreground mb-2">
          No items in batch
        </h2>
        <p className="text-sm text-foreground-muted mb-6 text-center">
          Go back to scan mode to add items
        </p>
        <Button variant="primary" onClick={handleBack}>
          Back to Scanning
        </Button>
      </div>
    );
  }

  // Gradient background based on transaction type
  const gradientClass = transactionType === "in"
    ? "before:from-[rgba(40,167,69,0.35)] before:via-[rgba(40,167,69,0.08)]"
    : "before:from-[rgba(220,53,69,0.35)] before:via-[rgba(220,53,69,0.08)]";

  return (
    <div className={`relative flex flex-col h-full before:absolute before:inset-0 before:bg-gradient-to-b ${gradientClass} before:via-40% before:to-transparent before:to-75% before:pointer-events-none before:-z-10`}>
      {/* Header with back button and transaction type */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<ArrowLeft className="w-4 h-4" />}
          onClick={handleBack}
        >
          Back
        </Button>
        <Badge
          colorScheme={transactionType === "in" ? "success" : "error"}
          variant="solid"
          size="lg"
        >
          {transactionType === "in" ? "CHECK IN" : "CHECK OUT"}
        </Badge>
      </div>

      {/* Offline warning */}
      {!isOnline && (
        <Alert status="warning" variant="subtle" className="mb-4">
          <AlertTriangle className="w-4 h-4" />
          You&apos;re offline. Transactions will be queued and synced later.
        </Alert>
      )}

      {/* Error message */}
      {submitError && (
        <Alert status="error" variant="subtle" className="mb-4">
          <AlertTriangle className="w-4 h-4" />
          {submitError}
        </Alert>
      )}

      {/* Stock exceeded warning */}
      {hasStockExceeded && !submitError && (
        <Alert status="error" variant="subtle" className="mb-4">
          <AlertTriangle className="w-4 h-4" />
          Some items exceed available stock. Please adjust quantities.
        </Alert>
      )}

      {/* Item count summary */}
      <div className="flex items-center justify-between mb-4 px-1">
        <Badge colorScheme="neutral" variant="subtle" size="sm">
          {totalItems} item{totalItems !== 1 ? "s" : ""}
        </Badge>
        <Badge colorScheme="neutral" variant="subtle" size="sm">
          {totalUnits} total unit{totalUnits !== 1 ? "s" : ""}
        </Badge>
      </div>

      {/* Scrollable item list */}
      <div className="flex-1 overflow-y-auto space-y-2 mb-4">
        {batchItems.map((batchItem) => (
          <BatchItemRow
            key={batchItem.itemId}
            batchItem={batchItem}
            transactionType={transactionType}
            variant="full"
            onQuantityChange={handleQuantityChange}
            onRemove={handleRemove}
            className={failedItems.includes(batchItem.itemId) ? "ring-2 ring-error" : ""}
          />
        ))}
      </div>

      {/* Fixed bottom submit button */}
      <div className="pt-4 mt-auto relative">
        <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-t from-white via-white to-transparent -translate-y-full pointer-events-none" />
        <Button
          variant="cta"
          isFullWidth
          size="lg"
          onClick={handleSubmitClick}
          disabled={hasStockExceeded || isSubmitting}
        >
          Submit All ({totalItems} item{totalItems !== 1 ? "s" : ""})
        </Button>
      </div>

      {/* Confirmation Modal */}
      <BatchConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmSubmit}
        transactionType={transactionType}
        itemCount={totalItems}
        totalUnits={totalUnits}
        isSubmitting={isSubmitting}
        progress={isSubmitting ? submitProgress : undefined}
      />
    </div>
  );
}
