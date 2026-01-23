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
import { updateItem } from "@/lib/actions/items";
import type { Item } from "@/lib/supabase/types";
import { Image as ImageIcon, Camera } from "lucide-react";

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
  const [activeTabIndex, setActiveTabIndex] = React.useState(0);

  const imageUploadRef = React.useRef<ImageUploadRef>(null);

  const isCameraTab = activeTabIndex === 1;

  // Reset form when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setImageUrl(item.image_url);
      setError(null);
      setHasChanges(false);
      setActiveTabIndex(0); // Reset to gallery tab
    }
  }, [isOpen, item.image_url]);

  const handleImageChange = (url: string | null) => {
    setImageUrl(url);
    setHasChanges(url !== item.image_url);
  };

  const handleCameraCapture = async (file: File) => {
    // Process the file through ImageUpload to handle upload
    if (imageUploadRef.current) {
      await imageUploadRef.current.processFile(file);
    }
    // Switch to gallery tab to show the preview
    setActiveTabIndex(0);
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
              <Tab index={1} isDisabled={isSubmitting}>
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
                  disabled={isSubmitting}
                />
              </TabPanel>

              <TabPanel index={1} className="py-3">
                {/* Only render camera when tab is active to avoid resource usage */}
                {isCameraTab && (
                  <CameraCapture
                    onCapture={handleCameraCapture}
                    onError={handleCameraError}
                    disabled={isSubmitting}
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
