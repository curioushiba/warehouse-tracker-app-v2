"use client";

import * as React from "react";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Textarea,
  Alert,
} from "@/components/ui";
import { submitTransaction } from "@/lib/actions/transactions";
import type { Item } from "@/lib/supabase/types";

export interface StockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: Item;
  onSuccess: () => void;
}

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({
  isOpen,
  onClose,
  item,
  onSuccess,
}) => {
  const [quantity, setQuantity] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const quantityRef = React.useRef<HTMLInputElement>(null);

  // Reset form when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setQuantity("");
      setNotes("");
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedQuantity = parseFloat(quantity);

    // Validate quantity
    if (isNaN(parsedQuantity) || parsedQuantity === 0) {
      setError("Please enter a non-zero adjustment quantity");
      return;
    }

    // Validate notes (required for adjustments)
    if (!notes.trim()) {
      setError("Notes are required for stock adjustments");
      return;
    }

    // Check that result won't go negative
    const newStock = item.current_stock + parsedQuantity;
    if (newStock < 0) {
      setError(
        `Cannot reduce stock by ${Math.abs(parsedQuantity)} ${item.unit}. Current stock is ${item.current_stock} ${item.unit}`
      );
      return;
    }

    setIsSubmitting(true);

    const result = await submitTransaction({
      transactionType: "adjustment",
      itemId: item.id,
      quantity: parsedQuantity,
      notes: notes.trim(),
    });

    setIsSubmitting(false);

    if (result.success) {
      onSuccess();
      onClose();
    } else {
      setError(result.error);
    }
  };

  const parsedQty = parseFloat(quantity) || 0;
  const projectedStock = item.current_stock + parsedQty;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" initialFocusRef={quantityRef}>
      <form onSubmit={handleSubmit}>
        <ModalHeader showCloseButton onClose={onClose}>
          Adjust Stock
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-background-secondary rounded-lg">
              <div>
                <p className="text-sm font-medium">{item.name}</p>
                <p className="text-xs text-foreground-muted">{item.sku}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-foreground-muted">Current Stock</p>
                <p className="text-lg font-semibold">
                  {item.current_stock} {item.unit}
                </p>
              </div>
            </div>

            {error && (
              <Alert status="error" variant="subtle">
                {error}
              </Alert>
            )}

            <div className="space-y-1">
              <label
                htmlFor="adjustment-quantity"
                className="block text-sm font-medium text-foreground"
              >
                Adjustment Quantity
              </label>
              <Input
                ref={quantityRef}
                id="adjustment-quantity"
                type="number"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g., +10 or -5"
                rightElement={
                  <span className="text-foreground-muted text-sm">{item.unit}</span>
                }
                disabled={isSubmitting}
              />
              <p className="text-xs text-foreground-muted">
                Use positive numbers to add, negative to remove
              </p>
            </div>

            {quantity && !isNaN(parsedQty) && parsedQty !== 0 && (
              <div className="p-3 bg-primary-50 rounded-lg">
                <p className="text-sm">
                  <span className="text-foreground-muted">Projected stock: </span>
                  <span
                    className={`font-semibold ${
                      projectedStock < 0 ? "text-error" : "text-foreground"
                    }`}
                  >
                    {projectedStock} {item.unit}
                  </span>
                </p>
              </div>
            )}

            <div className="space-y-1">
              <label
                htmlFor="adjustment-notes"
                className="block text-sm font-medium text-foreground"
              >
                Notes <span className="text-error">*</span>
              </label>
              <Textarea
                id="adjustment-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Reason for adjustment (e.g., inventory count correction)"
                rows={3}
                disabled={isSubmitting}
              />
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Submit Adjustment
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
};

export default StockAdjustmentModal;
