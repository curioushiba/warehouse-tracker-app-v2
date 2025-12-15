"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  IconButton,
  Input,
} from "@/components/ui";
import { FormControl, FormErrorMessage } from "@/components/ui/Form";
import { bulkCreateItems } from "@/lib/actions/items";

export interface BulkAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (count: number) => void;
}

interface RowError {
  message: string;
}

export const BulkAddModal: React.FC<BulkAddModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [rows, setRows] = React.useState<string[]>([""]);
  const [errors, setErrors] = React.useState<Map<number, RowError>>(new Map());
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  // Refs for focusing new inputs
  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  // Reset state when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setRows([""]);
      setErrors(new Map());
      setIsSubmitting(false);
      setSubmitError(null);
      inputRefs.current = [];
    }
  }, [isOpen]);

  // Validate all rows and return errors map
  const validateRows = React.useCallback((currentRows: string[]): Map<number, RowError> => {
    const newErrors = new Map<number, RowError>();
    const seenNames = new Map<string, number>(); // name -> first occurrence index

    currentRows.forEach((row, index) => {
      const trimmed = row.trim();
      const lowerTrimmed = trimmed.toLowerCase();

      // Check for empty
      if (trimmed === "") {
        newErrors.set(index, { message: "Name required" });
        return;
      }

      // Check for name too long
      if (trimmed.length > 255) {
        newErrors.set(index, { message: "Name too long (max 255 chars)" });
        return;
      }

      // Check for duplicates (case-insensitive)
      const firstOccurrence = seenNames.get(lowerTrimmed);
      if (firstOccurrence !== undefined) {
        // Mark both as duplicates
        newErrors.set(firstOccurrence, { message: "Duplicate name" });
        newErrors.set(index, { message: "Duplicate name" });
      } else {
        seenNames.set(lowerTrimmed, index);
      }
    });

    return newErrors;
  }, []);

  // Handle row value change
  const handleRowChange = (index: number, value: string) => {
    const newRows = [...rows];
    newRows[index] = value;
    setRows(newRows);
    setErrors(validateRows(newRows));
    setSubmitError(null);
  };

  // Add new row
  const handleAddRow = () => {
    const newRows = [...rows, ""];
    setRows(newRows);
    setErrors(validateRows(newRows));

    // Focus the new input after render
    setTimeout(() => {
      inputRefs.current[newRows.length - 1]?.focus();
    }, 0);
  };

  // Remove row
  const handleRemoveRow = (index: number) => {
    if (rows.length === 1) return; // Keep at least one row

    const newRows = rows.filter((_, i) => i !== index);
    setRows(newRows);
    setErrors(validateRows(newRows));
  };

  // Handle Enter key to add new row
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (index === rows.length - 1) {
        handleAddRow();
      } else {
        // Focus next input
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  // Count valid items (non-empty, no errors)
  const validItemCount = React.useMemo(() => {
    return rows.filter((row, index) => row.trim() !== "" && !errors.has(index)).length;
  }, [rows, errors]);

  // Check if form can be submitted
  const canSubmit = validItemCount > 0 && !isSubmitting;

  // Handle submit
  const handleSubmit = async () => {
    // Get valid names only
    const validNames = rows
      .filter((row, index) => row.trim() !== "" && !errors.has(index))
      .map((row) => row.trim());

    if (validNames.length === 0) {
      setSubmitError("At least one valid item name is required");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const result = await bulkCreateItems(validNames);

      if (result.success) {
        onSuccess(result.data.length);
        onClose();
      } else {
        setSubmitError(result.error);
      }
    } catch (err) {
      setSubmitError("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalHeader showCloseButton onClose={onClose}>
        Bulk Add Items
      </ModalHeader>
      <ModalBody>
        <div className="space-y-3">
          <p className="text-sm text-foreground-muted mb-4">
            Enter item names below. Each item will be created with default values
            (auto-generated SKU, unit: pcs, stock: 0).
          </p>

          {/* Item rows */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              Item Names
            </label>
            {rows.map((row, index) => {
              const error = errors.get(index);
              return (
                <FormControl key={index} isInvalid={!!error}>
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <Input
                        ref={(el) => {
                          inputRefs.current[index] = el;
                        }}
                        placeholder={`Item name ${index + 1}`}
                        value={row}
                        onChange={(e) => handleRowChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, index)}
                        isInvalid={!!error}
                        autoFocus={index === 0}
                      />
                      {error && (
                        <FormErrorMessage>{error.message}</FormErrorMessage>
                      )}
                    </div>
                    <IconButton
                      icon={<Trash2 className="w-4 h-4" />}
                      aria-label="Remove item"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveRow(index)}
                      disabled={rows.length === 1}
                      className="text-foreground-muted hover:text-error mt-1"
                    />
                  </div>
                </FormControl>
              );
            })}
          </div>

          {/* Add another item button */}
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={handleAddRow}
            className="w-full"
          >
            Add Another Item
          </Button>

          {/* Submit error message */}
          {submitError && (
            <div className="p-3 bg-error-light rounded-lg border border-error/20">
              <p className="text-sm text-error">{submitError}</p>
            </div>
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          variant="cta"
          onClick={handleSubmit}
          disabled={!canSubmit}
          isLoading={isSubmitting}
        >
          {validItemCount > 0 ? `Add ${validItemCount} Item${validItemCount > 1 ? "s" : ""}` : "Add Items"}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default BulkAddModal;
