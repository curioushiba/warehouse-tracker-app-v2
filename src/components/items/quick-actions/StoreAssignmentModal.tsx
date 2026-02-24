"use client";

import * as React from "react";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Select,
  Alert,
} from "@/components/ui";
import { useOfflineItemEdit } from "@/hooks/useOfflineItemEdit";
import type { Item, Store } from "@/lib/supabase/types";
import { CloudOff } from "lucide-react";

export interface StoreAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: Item;
  stores: Store[];
  onSuccess: (updatedItem: Item) => void;
}

export const StoreAssignmentModal: React.FC<StoreAssignmentModalProps> = ({
  isOpen,
  onClose,
  item,
  stores,
  onSuccess,
}) => {
  const [storeId, setStoreId] = React.useState<string>("");
  const [localError, setLocalError] = React.useState<string | null>(null);
  const { submitEdit, isSubmitting, error, isOnline } = useOfflineItemEdit();

  // Reset form when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setStoreId(item.store_id ?? "");
      setLocalError(null);
    }
  }, [isOpen, item.store_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    const result = await submitEdit(
      item.id,
      { store_id: storeId === "" ? null : storeId },
      item.version,
      item
    );

    if (result.success) {
      if (result.data) {
        onSuccess(result.data);
      }
      onClose();
    } else {
      setLocalError(result.error || "Failed to update store");
    }
  };

  const displayError = localError || error;

  const storeOptions = [
    { value: "", label: "No store" },
    ...stores.map((s) => ({ value: s.id, label: s.name })),
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <form onSubmit={handleSubmit}>
        <ModalHeader showCloseButton onClose={onClose}>
          Assign Store
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <p className="text-sm text-foreground-muted">
              Select a store for <strong>{item.name}</strong>
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
                htmlFor="store-select"
                className="block text-sm font-medium text-foreground"
              >
                Store
              </label>
              <Select
                id="store-select"
                options={storeOptions}
                value={storeId}
                onChange={setStoreId}
                placeholder="Select a store"
                isDisabled={isSubmitting}
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

export default StoreAssignmentModal;
