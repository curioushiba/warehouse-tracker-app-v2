"use client";

import * as React from "react";
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { cn } from "@/lib/utils";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { BatchTransactionType } from "@/contexts/BatchScanContext";

export interface BatchConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  transactionType: BatchTransactionType;
  itemCount: number;
  totalUnits: number;
  isSubmitting?: boolean;
}

export const BatchConfirmModal: React.FC<BatchConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  transactionType,
  itemCount,
  totalUnits,
  isSubmitting = false,
}) => {
  const isCheckIn = transactionType === "in";
  const typeLabel = isCheckIn ? "CHECK IN" : "CHECK OUT";
  const TypeIcon = isCheckIn ? ArrowDownToLine : ArrowUpFromLine;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" closeOnOverlayClick={!isSubmitting}>
      <ModalHeader showCloseButton={!isSubmitting} onClose={onClose}>
        Confirm {typeLabel}
      </ModalHeader>

      <ModalBody>
        <div className="flex flex-col items-center text-center">
          <div
            className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center mb-4",
              isCheckIn ? "bg-success-light" : "bg-error-light"
            )}
          >
            <TypeIcon
              className={cn(
                "w-8 h-8",
                isCheckIn ? "text-success" : "text-error"
              )}
            />
          </div>

          <Badge
            colorScheme={isCheckIn ? "success" : "error"}
            variant="solid"
            size="lg"
            className="mb-4"
          >
            {typeLabel}
          </Badge>

          <div className="bg-secondary rounded-lg p-4 w-full">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-foreground-muted">Items</span>
              <span className="font-semibold text-foreground">
                {itemCount} item{itemCount !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-foreground-muted">Total Units</span>
              <span className="font-semibold text-foreground">
                {totalUnits} unit{totalUnits !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          <p className="text-sm text-foreground-muted mt-4">
            This will create {itemCount} separate transaction{itemCount !== 1 ? "s" : ""}.
          </p>
        </div>
      </ModalBody>

      <ModalFooter>
        <Button
          variant="secondary"
          onClick={onClose}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          variant={isCheckIn ? "primary" : "danger"}
          onClick={onConfirm}
          isLoading={isSubmitting}
          loadingText="Submitting..."
        >
          Confirm & Submit
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default BatchConfirmModal;
