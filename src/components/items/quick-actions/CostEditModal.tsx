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
import { useSettings } from "@/contexts/SettingsContext";
import type { Item } from "@/lib/supabase/types";

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
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Reset form when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setUnitPrice(item.unit_price?.toString() ?? "");
      setError(null);
    }
  }, [isOpen, item.unit_price]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedPrice = unitPrice === "" ? null : parseFloat(unitPrice);

    // Validate
    if (parsedPrice !== null && (isNaN(parsedPrice) || parsedPrice < 0)) {
      setError("Cost must be a valid positive number");
      return;
    }

    setIsSubmitting(true);

    const result = await updateItem(
      item.id,
      { unit_price: parsedPrice },
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

            {error && (
              <Alert status="error" variant="subtle">
                {error}
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
            Save
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
};

export default CostEditModal;
