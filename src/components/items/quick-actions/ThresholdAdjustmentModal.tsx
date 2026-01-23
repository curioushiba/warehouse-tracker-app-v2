"use client";

import * as React from "react";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Alert,
} from "@/components/ui";
import { updateItem } from "@/lib/actions/items";
import type { Item } from "@/lib/supabase/types";

export interface ThresholdAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: Item;
  onSuccess: (updatedItem: Item) => void;
}

export const ThresholdAdjustmentModal: React.FC<ThresholdAdjustmentModalProps> = ({
  isOpen,
  onClose,
  item,
  onSuccess,
}) => {
  const [minStock, setMinStock] = React.useState("");
  const [maxStock, setMaxStock] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const minInputRef = React.useRef<HTMLInputElement>(null);

  // Reset form when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setMinStock(item.min_stock?.toString() ?? "0");
      setMaxStock(item.max_stock?.toString() ?? "");
      setError(null);
    }
  }, [isOpen, item.min_stock, item.max_stock]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedMin = parseFloat(minStock);
    const parsedMax = maxStock === "" ? null : parseFloat(maxStock);

    // Validate min stock
    if (isNaN(parsedMin) || parsedMin < 0) {
      setError("Minimum stock must be a valid positive number");
      return;
    }

    // Validate max stock if provided
    if (parsedMax !== null && (isNaN(parsedMax) || parsedMax < 0)) {
      setError("Maximum stock must be a valid positive number");
      return;
    }

    // Validate max > min if both are set
    if (parsedMax !== null && parsedMax <= parsedMin) {
      setError("Maximum stock must be greater than minimum stock");
      return;
    }

    setIsSubmitting(true);

    const result = await updateItem(
      item.id,
      { min_stock: parsedMin, max_stock: parsedMax },
      item.version
    );

    setIsSubmitting(false);

    if (result.success) {
      onSuccess(result.data);
      onClose();
    } else {
      setError(result.error);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" initialFocusRef={minInputRef}>
      <form onSubmit={handleSubmit}>
        <ModalHeader showCloseButton onClose={onClose}>
          Adjust Stock Thresholds
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <p className="text-sm text-foreground-muted">
              Set stock thresholds for <strong>{item.name}</strong>
            </p>

            {error && (
              <Alert status="error" variant="subtle">
                {error}
              </Alert>
            )}

            <div className="space-y-1">
              <label
                htmlFor="min-stock"
                className="block text-sm font-medium text-foreground"
              >
                Minimum Stock
              </label>
              <Input
                ref={minInputRef}
                id="min-stock"
                type="number"
                step="any"
                min="0"
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
                placeholder="0"
                rightElement={
                  <span className="text-foreground-muted text-sm">{item.unit}</span>
                }
                disabled={isSubmitting}
              />
              <p className="text-xs text-foreground-muted">
                Stock below this level will show as &quot;Low Stock&quot;
              </p>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="max-stock"
                className="block text-sm font-medium text-foreground"
              >
                Maximum Stock
              </label>
              <Input
                id="max-stock"
                type="number"
                step="any"
                min="0"
                value={maxStock}
                onChange={(e) => setMaxStock(e.target.value)}
                placeholder="Unlimited"
                rightElement={
                  <span className="text-foreground-muted text-sm">{item.unit}</span>
                }
                disabled={isSubmitting}
              />
              <p className="text-xs text-foreground-muted">
                Leave empty for unlimited. Stock above this will show as &quot;Overstocked&quot;
              </p>
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
            Save
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
};

export default ThresholdAdjustmentModal;
