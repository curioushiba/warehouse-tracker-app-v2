"use client";

import * as React from "react";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ItemImage } from "@/components/items";
import type { ScanFeedbackItem } from "@/hooks/useScanFeedback";

export interface ScanSuccessOverlayProps {
  item: ScanFeedbackItem | null;
  isVisible: boolean;
  isExiting: boolean;
}

export const ScanSuccessOverlay: React.FC<ScanSuccessOverlayProps> = ({
  item,
  isVisible,
  isExiting,
}) => {
  if (!isVisible || !item) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`${item.itemName} added to list`}
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center pointer-events-none",
        isExiting ? "animate-fade-out" : "animate-fade-in"
      )}
    >
      {/* Semi-transparent backdrop */}
      <div className="absolute inset-0 bg-black/20" />

      {/* Card */}
      <div
        className={cn(
          "relative bg-white rounded-2xl shadow-2xl p-6 mx-4 max-w-[280px] w-full",
          isExiting ? "animate-fade-out" : "animate-scale-in"
        )}
      >
        <div className="flex flex-col items-center text-center">
          {/* Item Image */}
          <div className="mb-4">
            <ItemImage
              imageUrl={item.itemImageUrl}
              itemName={item.itemName}
              size="xl"
              className="ring-4 ring-success-light"
            />
          </div>

          {/* Item Name */}
          <p className="font-semibold text-foreground text-lg mb-3 line-clamp-2">
            {item.itemName}
          </p>

          {/* Success Indicator */}
          <div className="flex items-center gap-2 text-success">
            <CheckCircle2 className="w-6 h-6" />
            <span className="font-semibold text-lg">Added!</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScanSuccessOverlay;
