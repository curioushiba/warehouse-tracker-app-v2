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
import type { Item, Category } from "@/lib/supabase/types";
import { CloudOff } from "lucide-react";

export interface CategoryAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: Item;
  categories: Category[];
  onSuccess: (updatedItem: Item) => void;
}

export const CategoryAssignmentModal: React.FC<CategoryAssignmentModalProps> = ({
  isOpen,
  onClose,
  item,
  categories,
  onSuccess,
}) => {
  const [categoryId, setCategoryId] = React.useState<string>("");
  const [localError, setLocalError] = React.useState<string | null>(null);
  const { submitEdit, isSubmitting, error, isOnline } = useOfflineItemEdit();

  // Reset form when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setCategoryId(item.category_id ?? "");
      setLocalError(null);
    }
  }, [isOpen, item.category_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    const result = await submitEdit(
      item.id,
      { category_id: categoryId === "" ? null : categoryId },
      item.version
    );

    if (result.success) {
      if (result.data) {
        onSuccess(result.data);
      }
      onClose();
    } else {
      setLocalError(result.error || "Failed to update category");
    }
  };

  const displayError = localError || error;

  const categoryOptions = [
    { value: "", label: "No category" },
    ...categories.map((cat) => ({ value: cat.id, label: cat.name })),
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <form onSubmit={handleSubmit}>
        <ModalHeader showCloseButton onClose={onClose}>
          Assign Category
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <p className="text-sm text-foreground-muted">
              Select a category for <strong>{item.name}</strong>
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
                htmlFor="category-select"
                className="block text-sm font-medium text-foreground"
              >
                Category
              </label>
              <Select
                id="category-select"
                options={categoryOptions}
                value={categoryId}
                onChange={setCategoryId}
                placeholder="Select a category"
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

export default CategoryAssignmentModal;
