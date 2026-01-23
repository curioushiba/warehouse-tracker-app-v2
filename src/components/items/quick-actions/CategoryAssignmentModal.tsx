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
import { updateItem } from "@/lib/actions/items";
import type { Item, Category } from "@/lib/supabase/types";

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
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Reset form when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setCategoryId(item.category_id ?? "");
      setError(null);
    }
  }, [isOpen, item.category_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await updateItem(
      item.id,
      { category_id: categoryId === "" ? null : categoryId },
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

            {error && (
              <Alert status="error" variant="subtle">
                {error}
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

export default CategoryAssignmentModal;
