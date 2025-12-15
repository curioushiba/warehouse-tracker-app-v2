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
import { submitTransaction } from "@/lib/actions";
import { useOnlineStatus } from "@/hooks";

export default function BatchReviewPage() {
  const router = useRouter();
  const { isOnline } = useOnlineStatus();
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

  // Handle confirmed submission
  const handleConfirmSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    setFailedItems([]);

    const newFailedItems: string[] = [];
    const successfulItems: string[] = [];

    for (const batchItem of batchItems) {
      const result = await submitTransaction({
        transactionType: apiTransactionType,
        itemId: batchItem.itemId,
        quantity: batchItem.quantity,
        // Use pre-generated idempotency key from when item was added
        idempotencyKey: batchItem.idempotencyKey,
      });

      if (result.success) {
        successfulItems.push(batchItem.itemId);
      } else {
        console.error(`Failed to submit transaction for ${batchItem.item.name}:`, result.error);
        newFailedItems.push(batchItem.itemId);
      }
    }

    setIsSubmitting(false);
    setShowConfirmModal(false);

    if (newFailedItems.length > 0) {
      // Remove successful items from batch, keep failed ones for retry
      if (successfulItems.length > 0) {
        removeItems(successfulItems);
      }
      setFailedItems(newFailedItems);
      setSubmitError(
        `${newFailedItems.length} item(s) failed to submit. ${successfulItems.length} succeeded.`
      );
    } else {
      // All succeeded - clear batch and navigate home
      clearBatch();
      // Show success toast by navigating with a success param
      router.push("/employee?batchSuccess=" + totalItems);
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
    ? "before:from-[rgba(40,167,69,0.55)] before:via-[rgba(40,167,69,0.15)]"
    : "before:from-[rgba(220,53,69,0.55)] before:via-[rgba(220,53,69,0.15)]";

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
        <span className="text-sm text-foreground-muted">
          {totalItems} item{totalItems !== 1 ? "s" : ""}
        </span>
        <span className="text-sm text-foreground-muted">
          {totalUnits} total unit{totalUnits !== 1 ? "s" : ""}
        </span>
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
      <div className="pt-4 mt-auto border-t border-border">
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
      />
    </div>
  );
}
