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
import { useSettings } from "@/contexts/SettingsContext";
import type { Item } from "@/lib/supabase/types";
import { CloudOff } from "lucide-react";

export interface CostEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: Item;
  onSuccess: (updatedItem: Item) => void;
}

export const CostEditModal: React.FC<CostEditModalProps> = ({
  isOpen,
  onClose,
  item,
  onSuccess,
}) => {
  const { settings } = useSettings();
  const [unitPrice, setUnitPrice] = React.useState("");
  const [localError, setLocalError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const { submitEdit, isSubmitting, error, isOnline } = useOfflineItemEdit();

  // Reset form when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setUnitPrice(item.unit_price?.toString() ?? "");
      setLocalError(null);
    }
  }, [isOpen, item.unit_price]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    const parsedPrice = unitPrice === "" ? null : parseFloat(unitPrice);

    // Validate
    if (parsedPrice !== null && (isNaN(parsedPrice) || parsedPrice < 0)) {
      setLocalError("Cost must be a valid positive number");
      return;
    }

    const result = await submitEdit(
      item.id,
      { unit_price: parsedPrice },
      item.version
    );

    if (result.success) {
      if (result.data) {
        onSuccess(result.data);
      }
      onClose();
    } else {
      setLocalError(result.error || "Failed to update cost");
    }
  };

  const displayError = localError || error;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" initialFocusRef={inputRef}>
      <form onSubmit={handleSubmit}>
        <ModalHeader showCloseButton onClose={onClose}>
          Edit Cost
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <p className="text-sm text-foreground-muted">
              Update the unit cost for <strong>{item.name}</strong>
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
                htmlFor="unit-price"
                className="block text-sm font-medium text-foreground"
              >
                Unit Cost{settings.currency ? ` (${settings.currency})` : ""}
              </label>
              <Input
                ref={inputRef}
                id="unit-price"
                type="number"
                step="0.01"
                min="0"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                placeholder="0.00"
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
            {!isOnline ? "Queue" : "Save"}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
};

export default CostEditModal;
