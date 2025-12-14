"use client";

import * as React from "react";
import { Package } from "lucide-react";
import { cn } from "@/lib/utils";

export type ItemImageSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface ItemImageProps {
  imageUrl: string | null | undefined;
  itemName: string;
  size?: ItemImageSize;
  className?: string;
}

const sizeConfig: Record<ItemImageSize, { container: string; icon: string }> = {
  xs: { container: "w-8 h-8", icon: "w-4 h-4" },
  sm: { container: "w-10 h-10", icon: "w-5 h-5" },
  md: { container: "w-12 h-12", icon: "w-6 h-6" },
  lg: { container: "w-16 h-16", icon: "w-8 h-8" },
  xl: { container: "w-24 h-24", icon: "w-12 h-12" },
};

export const ItemImage = React.forwardRef<HTMLDivElement, ItemImageProps>(
  ({ imageUrl, itemName, size = "sm", className }, ref) => {
    const { container, icon } = sizeConfig[size];

    if (imageUrl) {
      return (
        <div
          ref={ref}
          className={cn(
            container,
            "rounded-lg overflow-hidden flex-shrink-0",
            className
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={itemName}
            className="w-full h-full object-cover"
          />
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(
          container,
          "bg-primary-50 rounded-lg flex items-center justify-center flex-shrink-0",
          className
        )}
      >
        <Package className={cn(icon, "text-primary")} />
      </div>
    );
  }
);

ItemImage.displayName = "ItemImage";

export default ItemImage;
