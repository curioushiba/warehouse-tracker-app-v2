"use client";

import * as React from "react";
import Link from "next/link";
import { Minus, Plus } from "lucide-react";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  IconButton,
  Input,
  Textarea,
  Alert,
  useToastHelpers,
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
  const { toast } = useToastHelpers();
  const [newStock, setNewStock] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Reset form when modal opens - initialize with current stock
  React.useEffect(() => {
    if (isOpen) {
      setNewStock(item.current_stock.toString());
      setNotes("");
      setError(null);
    }
  }, [isOpen, item.current_stock]);

  const parsedNewStock = parseFloat(newStock) || 0;
  const adjustmentDelta = parsedNewStock - item.current_stock;

  const handleIncrement = () => {
    const newValue = parsedNewStock + 1;
    setNewStock(newValue.toString());
  };

  const handleDecrement = () => {
    const newValue = Math.max(0, parsedNewStock - 1);
    setNewStock(newValue.toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate new stock is a valid number
    if (isNaN(parsedNewStock)) {
      setError("Please enter a valid stock count");
      return;
    }

    // Validate new stock is >= 0
    if (parsedNewStock < 0) {
      setError("Stock count cannot be negative");
      return;
    }

    // Validate there's actually a change
    if (adjustmentDelta === 0) {
      setError("New stock count must be different from current stock");
      return;
    }

    // Notes are optional for adjustments

    setIsSubmitting(true);

    const result = await submitTransaction({
      transactionType: "adjustment",
      itemId: item.id,
      quantity: adjustmentDelta,
      notes: notes.trim() || undefined,
    });

    setIsSubmitting(false);

    if (result.success) {
      toast({
        title: `${item.name} adjusted`,
        description: `${item.current_stock} → ${parsedNewStock} ${item.unit} (${adjustmentDelta > 0 ? "+" : ""}${adjustmentDelta})`,
        status: "success",
        position: "bottom-right",
      });
      onSuccess();
      onClose();
    } else {
      setError(result.error);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" initialFocusRef={inputRef}>
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

            <Link
              href={`/admin/transactions?itemId=${item.id}`}
              className="text-sm text-primary hover:underline"
            >
              View transaction history →
            </Link>

            {error && (
              <Alert status="error" variant="subtle">
                {error}
              </Alert>
            )}

            <div className="space-y-1">
              <label
                htmlFor="new-stock-count"
                className="block text-sm font-medium text-foreground"
              >
                New Stock Count
              </label>
              <div className="flex items-center gap-2">
                <IconButton
                  type="button"
                  icon={<Minus className="w-4 h-4" />}
                  aria-label="Decrease stock count"
                  variant="secondary"
                  onClick={handleDecrement}
                  disabled={isSubmitting || parsedNewStock <= 0}
                />
                <Input
                  ref={inputRef}
                  id="new-stock-count"
                  type="number"
                  step="any"
                  min="0"
                  value={newStock}
                  onChange={(e) => setNewStock(e.target.value)}
                  rightElement={
                    <span className="text-foreground-muted text-sm">{item.unit}</span>
                  }
                  disabled={isSubmitting}
                  className="text-center"
                />
                <IconButton
                  type="button"
                  icon={<Plus className="w-4 h-4" />}
                  aria-label="Increase stock count"
                  variant="secondary"
                  onClick={handleIncrement}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {adjustmentDelta !== 0 && (
              <div
                className={`p-3 rounded-lg ${
                  adjustmentDelta > 0
                    ? "bg-success-50 text-success-700"
                    : "bg-error-50 text-error-700"
                }`}
              >
                <p className="text-sm font-medium">
                  Adjustment: {adjustmentDelta > 0 ? "+" : ""}
                  {adjustmentDelta} {item.unit}
                </p>
              </div>
            )}

            <div className="space-y-1">
              <label
                htmlFor="adjustment-notes"
                className="block text-sm font-medium text-foreground"
              >
                Notes (optional)
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
