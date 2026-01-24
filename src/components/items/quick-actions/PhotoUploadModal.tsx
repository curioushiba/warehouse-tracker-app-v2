"use client";

import * as React from "react";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Alert,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
} from "@/components/ui";
import { ImageUpload } from "@/components/items";
import type { ImageUploadRef } from "@/components/items";
import { CameraCapture } from "@/components/camera";
import { useOfflineItemEdit } from "@/hooks/useOfflineItemEdit";
import { useItemEditQueue } from "@/hooks/useItemEditQueue";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { createClient } from "@/lib/supabase/client";
import type { Item } from "@/lib/supabase/types";
import { Image as ImageIcon, Camera, CloudOff } from "lucide-react";

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
  const [pendingBlob, setPendingBlob] = React.useState<Blob | null>(null);
  const [pendingFilename, setPendingFilename] = React.useState<string>("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [hasChanges, setHasChanges] = React.useState(false);
  const [activeTabIndex, setActiveTabIndex] = React.useState(0);

  const imageUploadRef = React.useRef<ImageUploadRef>(null);
  const { isOnline } = useOnlineStatus();
  const { queueImage } = useItemEditQueue();
  const { submitEdit } = useOfflineItemEdit();

  const isCameraTab = activeTabIndex === 1;
  const isBusy = isSubmitting || isUploading;

  // Reset form when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setImageUrl(item.image_url);
      setPendingBlob(null);
      setPendingFilename("");
      setError(null);
      setHasChanges(false);
      setIsUploading(false);
      setActiveTabIndex(0); // Reset to gallery tab
    }
  }, [isOpen, item.image_url]);

  const handleImageChange = (url: string | null) => {
    setImageUrl(url);
    setHasChanges(url !== item.image_url);
  };

  // Upload file directly to Supabase Storage (independent of ImageUpload component)
  const uploadFile = React.useCallback(
    async (file: File): Promise<string> => {
      const supabase = createClient();

      // Generate unique filename
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
      const filePath = `${item.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("item-images")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("item-images")
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    },
    [item.id]
  );

  const handleCameraCapture = async (file: File) => {
    setError(null);

    if (isOnline) {
      // Online: upload directly to Supabase Storage
      setIsUploading(true);

      try {
        const publicUrl = await uploadFile(file);

        // Update state with the new image URL
        setImageUrl(publicUrl);
        setPendingBlob(null);
        setPendingFilename("");
        setHasChanges(true);

        // Switch to gallery tab to show the preview
        setActiveTabIndex(0);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
      } finally {
        setIsUploading(false);
      }
    } else {
      // Offline: store blob for later upload and create local preview
      const localUrl = URL.createObjectURL(file);
      setImageUrl(localUrl);
      setPendingBlob(file);
      setPendingFilename(file.name);
      setHasChanges(true);

      // Switch to gallery tab to show the preview
      setActiveTabIndex(0);
    }
  };

  const handleCameraError = (errorMsg: string) => {
    setError(errorMsg);
  };

  const handleSubmit = async () => {
    if (!hasChanges) {
      onClose();
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      // If we have a pending blob (from offline camera capture), queue it
      if (pendingBlob && !isOnline) {
        await queueImage(item.id, pendingBlob, pendingFilename);

        // Create an optimistic item for UI update
        const optimisticItem = {
          ...item,
          image_url: imageUrl,
          version: item.version + 1,
        };

        onSuccess(optimisticItem);
        onClose();
        return;
      }

      // Otherwise, submit the image URL update
      const result = await submitEdit(
        item.id,
        { image_url: imageUrl },
        item.version,
        item
      );

      if (result.success) {
        if (result.data) {
          onSuccess(result.data);
        }
        onClose();
      } else {
        setError(result.error || "Failed to update image");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save image");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      closeOnOverlayClick={!isBusy}
      closeOnEsc={!isBusy}
    >
      <ModalHeader showCloseButton={!isBusy} onClose={onClose}>
        {isUploading ? "Uploading Photo..." : "Update Photo"}
      </ModalHeader>
      <ModalBody>
        <div className="space-y-4">
          <p className="text-sm text-foreground-muted">
            Upload or update the photo for <strong>{item.name}</strong>
          </p>

          {!isOnline && (
            <Alert status="warning" variant="subtle">
              <span className="flex items-center gap-2">
                <CloudOff className="w-4 h-4" />
                You are offline. Photos will upload when you reconnect.
              </span>
            </Alert>
          )}

          {error && (
            <Alert status="error" variant="subtle">
              {error}
            </Alert>
          )}

          <Tabs
            index={activeTabIndex}
            onChange={setActiveTabIndex}
            variant="enclosed"
            isFitted
          >
            <TabList>
              <Tab index={0}>
                <span className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  <span>Gallery</span>
                </span>
              </Tab>
              <Tab index={1} isDisabled={isBusy}>
                <span className="flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  <span>Take Photo</span>
                </span>
              </Tab>
            </TabList>

            <TabPanels>
              <TabPanel index={0} className="py-3">
                <ImageUpload
                  ref={imageUploadRef}
                  value={imageUrl}
                  onChange={handleImageChange}
                  itemId={item.id}
                  disabled={isBusy}
                />
              </TabPanel>

              <TabPanel index={1} className="py-3">
                {/* Only render camera when tab is active to avoid resource usage */}
                {isCameraTab && (
                  <CameraCapture
                    onCapture={handleCameraCapture}
                    onError={handleCameraError}
                    disabled={isSubmitting}
                    isUploading={isUploading}
                  />
                )}
              </TabPanel>
            </TabPanels>
          </Tabs>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button
          type="button"
          variant="secondary"
          onClick={onClose}
          disabled={isBusy}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="primary"
          onClick={handleSubmit}
          isLoading={isSubmitting}
          disabled={!hasChanges || isUploading}
        >
          {!isOnline && pendingBlob ? "Queue" : "Save"}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default PhotoUploadModal;
