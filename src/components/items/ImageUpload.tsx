"use client";

import * as React from "react";
import { Upload, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

export interface ImageUploadProps {
  value: string | null;
  onChange: (url: string | null) => void;
  itemId?: string;
  disabled?: boolean;
  className?: string;
}

/** Ref handle for programmatic file processing */
export interface ImageUploadRef {
  /** Process a file programmatically (e.g., from camera capture) */
  processFile: (file: File) => Promise<void>;
}

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_MB = 10;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

// Helper to extract storage path from URL (handles query params)
const extractStoragePath = (url: string, bucketName: string): string | null => {
  try {
    const urlObj = new URL(url);
    const pathMatch = urlObj.pathname.match(new RegExp(`/storage/v1/object/public/${bucketName}/(.+)`));
    return pathMatch ? decodeURIComponent(pathMatch[1]) : null;
  } catch {
    // Fallback for malformed URLs
    const marker = `/${bucketName}/`;
    const idx = url.indexOf(marker);
    if (idx === -1) return null;
    const pathWithParams = url.slice(idx + marker.length);
    return pathWithParams.split("?")[0]; // Remove query params
  }
};

export const ImageUpload = React.forwardRef<ImageUploadRef, ImageUploadProps>(
  ({ value, onChange, itemId, disabled = false, className }, ref) => {
    const [isDragging, setIsDragging] = React.useState(false);
    const [isUploading, setIsUploading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const containerRef = React.useRef<HTMLDivElement>(null);
    // Track temp uploads for cleanup on unmount
    const tempUploadRef = React.useRef<string | null>(null);

    // Update preview when value changes
    React.useEffect(() => {
      setPreviewUrl(value);
    }, [value]);

    // Keep track of the current value for cleanup comparison
    const valueRef = React.useRef(value);
    React.useEffect(() => {
      valueRef.current = value;
    }, [value]);

    // Cleanup blob URLs on unmount to prevent memory leaks
    React.useEffect(() => {
      return () => {
        if (previewUrl && previewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(previewUrl);
        }
      };
    }, [previewUrl]);

    // Cleanup orphaned temp images on unmount (if not saved to an item)
    React.useEffect(() => {
      return () => {
        const tempUrl = tempUploadRef.current;
        // Only cleanup if: we have a temp URL AND it's not the current value
        // (if value === tempUrl, the form is being submitted with this image)
        if (tempUrl && tempUrl.includes("/temp/") && valueRef.current !== tempUrl) {
          const supabase = createClient();
          const storagePath = extractStoragePath(tempUrl, "item-images");
          if (storagePath) {
            supabase.storage.from("item-images").remove([storagePath]).catch(() => {
              // Silently fail - cleanup is best-effort
            });
          }
        }
      };
    }, []);

    const validateFile = (file: File): string | null => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        return "Invalid file type. Please upload JPEG, PNG, or WebP.";
      }
      if (file.size > MAX_SIZE_BYTES) {
        return `File size exceeds ${MAX_SIZE_MB}MB limit.`;
      }
      return null;
    };

    const uploadFile = async (file: File): Promise<string | null> => {
      const supabase = createClient();

      // Generate unique filename
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
      const filePath = itemId ? `${itemId}/${fileName}` : `temp/${fileName}`;

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
    };

    const handleFile = React.useCallback(async (file: File) => {
      setError(null);

      // Validate file
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      // Create local preview immediately
      const localPreview = URL.createObjectURL(file);
      setPreviewUrl(localPreview);

      // Upload to Supabase Storage
      setIsUploading(true);
      try {
        const publicUrl = await uploadFile(file);
        if (publicUrl) {
          // Track temp uploads for cleanup if user navigates away
          if (!itemId) {
            tempUploadRef.current = publicUrl;
          }
          onChange(publicUrl);
          setPreviewUrl(publicUrl);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
        setPreviewUrl(value); // Revert to original
      } finally {
        setIsUploading(false);
        URL.revokeObjectURL(localPreview);
      }
    }, [itemId, onChange, value]);

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      if (disabled || isUploading) return;

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFile(file);
      }
    };

    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled && !isUploading) {
        setIsDragging(true);
      }
    };

    const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
      // Reset input so same file can be selected again
      e.target.value = "";
    };

    const handleRemove = async () => {
      if (disabled || isUploading) return;

      // If there's a current image URL from Supabase, delete it
      if (value && value.includes("item-images")) {
        try {
          const supabase = createClient();
          const storagePath = extractStoragePath(value, "item-images");
          if (storagePath) {
            await supabase.storage.from("item-images").remove([storagePath]);
          }
        } catch (err) {
          console.error("Failed to delete image:", err);
        }
      }

      // Clear temp upload tracking since user manually removed
      tempUploadRef.current = null;
      setPreviewUrl(null);
      onChange(null);
      setError(null);
    };

    const handleClick = () => {
      if (!disabled && !isUploading) {
        fileInputRef.current?.click();
      }
    };

    // Expose processFile method for programmatic file handling (e.g., camera capture)
    React.useImperativeHandle(ref, () => ({
      processFile: handleFile,
    }), [handleFile]);

    return (
      <div ref={containerRef} className={cn("space-y-2", className)}>
        <div
          onClick={handleClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={cn(
            "relative border-2 border-dashed rounded-lg transition-all cursor-pointer",
            isDragging && "border-primary bg-primary-50",
            !isDragging && !previewUrl && "border-border hover:border-primary/50",
            !isDragging && previewUrl && "border-transparent",
            disabled && "opacity-50 cursor-not-allowed",
            isUploading && "cursor-wait"
          )}
        >
          {previewUrl ? (
            <div className="relative aspect-video rounded-lg overflow-hidden bg-neutral-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Item preview"
                className={cn(
                  "w-full h-full object-cover",
                  isUploading && "opacity-50"
                )}
              />
              {isUploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {!disabled && !isUploading && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove();
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors"
                  aria-label="Remove image"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 px-4">
              <div className="w-12 h-12 mb-3 rounded-full bg-primary-50 flex items-center justify-center">
                {isUploading ? (
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Upload className="w-6 h-6 text-primary" />
                )}
              </div>
              <p className="text-sm font-medium text-foreground mb-1">
                {isUploading ? "Uploading..." : "Upload image"}
              </p>
              <p className="text-xs text-foreground-muted text-center">
                Drag and drop or click to browse
              </p>
              <p className="text-xs text-foreground-muted mt-1">
                JPEG, PNG, WebP up to {MAX_SIZE_MB}MB
              </p>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(",")}
            onChange={handleFileInput}
            disabled={disabled || isUploading}
            className="hidden"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-error">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>
    );
  }
);

ImageUpload.displayName = "ImageUpload";

export default ImageUpload;
