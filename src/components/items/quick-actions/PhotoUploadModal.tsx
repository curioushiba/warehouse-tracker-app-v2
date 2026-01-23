"use client";

import * as React from "react";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Alert,
} from "@/components/ui";
import { ImageUpload } from "@/components/items";
import { updateItem } from "@/lib/actions/items";
import type { Item } from "@/lib/supabase/types";

export interface PhotoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: Item;
  onSuccess: (updatedItem: Item) => void;
}

export const PhotoUploadModal: React.FC<PhotoUploadModalProps> = ({
  isOpen,
  onClose,
  item,
  onSuccess,
}) => {
  const [imageUrl, setImageUrl] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [hasChanges, setHasChanges] = React.useState(false);

  // Reset form when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setImageUrl(item.image_url);
      setError(null);
      setHasChanges(false);
    }
  }, [isOpen, item.image_url]);

  const handleImageChange = (url: string | null) => {
    setImageUrl(url);
    setHasChanges(url !== item.image_url);
  };

  const handleSubmit = async () => {
    if (!hasChanges) {
      onClose();
      return;
    }

    setError(null);
    setIsSubmitting(true);

    const result = await updateItem(
      item.id,
      { image_url: imageUrl },
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
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <ModalHeader showCloseButton onClose={onClose}>
        Update Photo
      </ModalHeader>
      <ModalBody>
        <div className="space-y-4">
          <p className="text-sm text-foreground-muted">
            Upload or update the photo for <strong>{item.name}</strong>
          </p>

          {error && (
            <Alert status="error" variant="subtle">
              {error}
            </Alert>
          )}

          <ImageUpload
            value={imageUrl}
            onChange={handleImageChange}
            itemId={item.id}
            disabled={isSubmitting}
          />
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
        <Button
          type="button"
          variant="primary"
          onClick={handleSubmit}
          isLoading={isSubmitting}
          disabled={!hasChanges}
        >
          Save
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default PhotoUploadModal;
