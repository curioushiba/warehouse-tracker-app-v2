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

export default function CommissaryBatchReviewPage() {
  const router = useRouter();
  const { queueTransaction, isOnline } = useSyncQueue();
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

  const apiTransactionType = transactionType === "in" ? "check_in" : "check_out";
  const isCheckOut = transactionType === "out";

  const hasStockExceeded = isCheckOut && batchItems.some(
    (item) => item.quantity > item.item.current_stock
  );

  const handleBack = () => {
    router.push(`/PWA/commissarypwa/scan?type=${apiTransactionType}`);
  };

  const handleQuantityChange = (itemId: string, quantity: number) => {
    updateQuantity(itemId, quantity);
    setSubmitError(null);
    setFailedItems([]);
  };

  const handleRemove = (itemId: string) => {
    removeItem(itemId);
    setSubmitError(null);
    setFailedItems((prev) => prev.filter((id) => id !== itemId));
  };

  const handleSubmitClick = () => {
    if (hasStockExceeded) {
      setSubmitError("Some items exceed available stock. Please adjust quantities.");
      return;
    }
    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    setFailedItems([]);
    setSubmitProgress({ current: 0, total: batchItems.length });

    const newFailedItems: string[] = [];

    try {
      for (let i = 0; i < batchItems.length; i++) {
        const batchItem = batchItems[i];
        try {
          await queueTransaction({
            transactionType: apiTransactionType,
            itemId: batchItem.itemId,
            quantity: batchItem.quantity,
            deviceTimestamp: new Date().toISOString(),
            domain: 'commissary',
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
        clearBatch();
        router.push("/PWA/commissarypwa?batchSuccess=" + totalItems);
      }
    } catch (err) {
      setIsSubmitting(false);
      setShowConfirmModal(false);
      setSubmitError("Failed to queue transactions. Please try again.");
      console.error("Batch queue error:", err);
    }
  };

  if (batchItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12">
        <Package className="w-16 h-16 text-foreground-muted mb-4" />
        <h2 className="text-lg font-semibold text-foreground mb-2">
          No items in batch
        </h2>
        <p className="text-sm text-foreground-muted mb-6 text-center">
          Go back to scan mode to add commissary items
        </p>
        <Button variant="primary" onClick={handleBack}>
          Back to Scanning
        </Button>
      </div>
    );
  }

  const gradientClass = transactionType === "in"
    ? "before:from-[rgba(40,167,69,0.55)] before:via-[rgba(40,167,69,0.15)]"
    : "before:from-[rgba(220,53,69,0.55)] before:via-[rgba(220,53,69,0.15)]";

  return (
    <div className={`relative flex flex-col h-full before:absolute before:inset-0 before:bg-gradient-to-b ${gradientClass} before:via-40% before:to-transparent before:to-75% before:pointer-events-none before:-z-10`}>
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

      {!isOnline && (
        <Alert status="warning" variant="subtle" className="mb-4">
          <AlertTriangle className="w-4 h-4" />
          You&apos;re offline. Transactions will be queued and synced later.
        </Alert>
      )}

      {submitError && (
        <Alert status="error" variant="subtle" className="mb-4">
          <AlertTriangle className="w-4 h-4" />
          {submitError}
        </Alert>
      )}

      {hasStockExceeded && !submitError && (
        <Alert status="error" variant="subtle" className="mb-4">
          <AlertTriangle className="w-4 h-4" />
          Some items exceed available stock. Please adjust quantities.
        </Alert>
      )}

      <div className="flex items-center justify-between mb-4 px-1">
        <span className="text-sm text-foreground-muted">
          {totalItems} item{totalItems !== 1 ? "s" : ""}
        </span>
        <span className="text-sm text-foreground-muted">
          {totalUnits} total unit{totalUnits !== 1 ? "s" : ""}
        </span>
      </div>

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

      <div className="pt-4 mt-auto border-t border-border">
        <Button
          variant="cta"
          isFullWidth
          size="lg"
          onClick={handleSubmitClick}
          disabled={hasStockExceeded || isSubmitting}
          className="!bg-[#E07A2F] hover:!bg-[#C46825]"
        >
          Submit All ({totalItems} item{totalItems !== 1 ? "s" : ""})
        </Button>
      </div>

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
