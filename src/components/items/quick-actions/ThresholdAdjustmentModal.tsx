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
import { useOfflineItemEdit } from "@/hooks/useOfflineItemEdit";
import type { Item } from "@/lib/supabase/types";
import { CloudOff } from "lucide-react";

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
  const [localError, setLocalError] = React.useState<string | null>(null);
  const minInputRef = React.useRef<HTMLInputElement>(null);
  const { submitEdit, isSubmitting, error, isOnline } = useOfflineItemEdit();

  // Reset form when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setMinStock(item.min_stock?.toString() ?? "0");
      setMaxStock(item.max_stock?.toString() ?? "");
      setLocalError(null);
    }
  }, [isOpen, item.min_stock, item.max_stock]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    const parsedMin = parseFloat(minStock);
    const parsedMax = maxStock === "" ? null : parseFloat(maxStock);

    // Validate min stock
    if (isNaN(parsedMin) || parsedMin < 0) {
      setLocalError("Minimum stock must be a valid positive number");
      return;
    }

    // Validate max stock if provided
    if (parsedMax !== null && (isNaN(parsedMax) || parsedMax < 0)) {
      setLocalError("Maximum stock must be a valid positive number");
      return;
    }

    // Validate max > min if both are set
    if (parsedMax !== null && parsedMax <= parsedMin) {
      setLocalError("Maximum stock must be greater than minimum stock");
      return;
    }

    const result = await submitEdit(
      item.id,
      { min_stock: parsedMin, max_stock: parsedMax },
      item.version
    );

    if (result.success) {
      if (result.data) {
        onSuccess(result.data);
      }
      onClose();
    } else {
      setLocalError(result.error || "Failed to update thresholds");
    }
  };

  const displayError = localError || error;

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

            {!isOnline && (
              <Alert status="warning" variant="subtle">
                <span className="flex items-center gap-2">
                  <CloudOff className="w-4 h-4" />
                  You are offline. Changes will sync when you reconnect.
                </span>
              </Alert>
            )}

            {displayError && (
              <Alert status="error" variant="subtle">
                {displayError}
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
            {!isOnline ? "Queue" : "Save"}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
};

export default ThresholdAdjustmentModal;
