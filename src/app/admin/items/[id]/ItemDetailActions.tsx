"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, RotateCcw, Edit, RefreshCw, AlertCircle } from "lucide-react";
import {
  Button,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Alert,
} from "@/components/ui";
import { archiveItem, restoreItem } from "@/lib/actions/items";

export interface ItemDetailActionsProps {
  itemId: string;
  itemName: string;
  isArchived: boolean;
}

export function ItemDetailActions({
  itemId,
  itemName,
  isArchived,
}: ItemDetailActionsProps) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const result = isArchived ? await restoreItem(itemId) : await archiveItem(itemId);

      if (!result.success) {
        setError(result.error || "Failed to update item status");
        return;
      }

      setConfirmOpen(false);
      router.refresh();
    } catch {
      setError("Failed to update item status");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        leftIcon={<RefreshCw className="w-4 h-4" />}
        onClick={() => router.refresh()}
        disabled={isSubmitting}
      >
        Refresh
      </Button>

      <Link href={`/admin/items/${itemId}/edit`}>
        <Button
          variant="outline"
          leftIcon={<Edit className="w-4 h-4" />}
          disabled={isSubmitting}
        >
          Edit
        </Button>
      </Link>

      <Button
        variant={isArchived ? "primary" : "outline"}
        leftIcon={
          isArchived ? (
            <RotateCcw className="w-4 h-4" />
          ) : (
            <Archive className="w-4 h-4" />
          )
        }
        onClick={() => setConfirmOpen(true)}
        disabled={isSubmitting}
      >
        {isArchived ? "Restore" : "Archive"}
      </Button>

      <Modal isOpen={confirmOpen} onClose={() => setConfirmOpen(false)} size="sm">
        <ModalHeader showCloseButton onClose={() => setConfirmOpen(false)}>
          {isArchived ? "Restore Item" : "Archive Item"}
        </ModalHeader>
        <ModalBody>
          <div className="text-center">
            <div
              className={`w-16 h-16 ${
                isArchived ? "bg-primary-50" : "bg-warning-50"
              } rounded-full flex items-center justify-center mx-auto mb-4`}
            >
              {isArchived ? (
                <RotateCcw className="w-8 h-8 text-primary" />
              ) : (
                <AlertCircle className="w-8 h-8 text-warning" />
              )}
            </div>

            <p className="text-foreground mb-2">
              {isArchived ? (
                <>
                  Are you sure you want to restore <strong>{itemName}</strong>?
                </>
              ) : (
                <>
                  Are you sure you want to archive <strong>{itemName}</strong>?
                </>
              )}
            </p>
            <p className="text-sm text-foreground-muted">
              {isArchived
                ? "The item will be active and visible again."
                : "The item will be hidden but can be restored later."}
            </p>

            {error && (
              <Alert status="error" variant="subtle" className="mt-4 text-left">
                {error}
              </Alert>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => setConfirmOpen(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant={isArchived ? "primary" : "danger"}
            onClick={handleConfirm}
            isLoading={isSubmitting}
            disabled={isSubmitting}
          >
            {isArchived ? "Restore" : "Archive"}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}


