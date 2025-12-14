"use client";

import * as React from "react";
import { Minus, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ItemImage } from "@/components/items/ItemImage";
import { IconButton } from "@/components/ui/Button";
import type { BatchItem, BatchTransactionType } from "@/contexts/BatchScanContext";

export interface BatchItemRowProps {
  batchItem: BatchItem;
  transactionType?: BatchTransactionType;
  variant?: "compact" | "full";
  onQuantityChange?: (itemId: string, quantity: number) => void;
  onRemove?: (itemId: string) => void;
  className?: string;
}

export const BatchItemRow = React.forwardRef<HTMLDivElement, BatchItemRowProps>(
  (
    {
      batchItem,
      transactionType = "in",
      variant = "full",
      onQuantityChange,
      onRemove,
      className,
    },
    ref
  ) => {
    const { itemId, item, quantity } = batchItem;
    const isCompact = variant === "compact";

    // Check if quantity exceeds stock for check_out transactions
    const exceedsStock =
      transactionType === "out" && quantity > item.current_stock;

    const handleDecrement = () => {
      if (quantity > 1 && onQuantityChange) {
        onQuantityChange(itemId, quantity - 1);
      }
    };

    const handleIncrement = () => {
      if (quantity < 9999 && onQuantityChange) {
        onQuantityChange(itemId, quantity + 1);
      }
    };

    const handleRemove = () => {
      onRemove?.(itemId);
    };

    if (isCompact) {
      // Compact variant for mini-list during scanning
      return (
        <div
          ref={ref}
          className={cn(
            "flex items-center justify-between py-2 px-3 bg-white rounded-lg",
            className
          )}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="font-medium text-sm text-foreground truncate">
              {item.name}
            </span>
            <span className="text-sm text-foreground-muted flex-shrink-0">
              x{quantity}
            </span>
          </div>
          <IconButton
            icon={<X className="w-4 h-4" />}
            aria-label={`Remove ${item.name}`}
            variant="ghost"
            size="xs"
            onClick={handleRemove}
            className="flex-shrink-0 -mr-1"
          />
        </div>
      );
    }

    // Full variant for review page
    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center gap-3 p-3 bg-white rounded-lg border border-border",
          exceedsStock && "border-error bg-error-light/30",
          className
        )}
      >
        <ItemImage
          imageUrl={item.image_url}
          itemName={item.name}
          size="sm"
          className="flex-shrink-0"
        />

        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-foreground truncate">
            {item.name}
          </p>
          <p className="text-xs text-foreground-muted">
            SKU: {item.sku}
          </p>
          <p className="text-xs text-foreground-muted">
            Stock: {item.current_stock} {item.unit}
          </p>
          {exceedsStock && (
            <p className="text-xs text-error font-medium mt-1">
              Exceeds available stock
            </p>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <IconButton
            icon={<Minus className="w-4 h-4" />}
            aria-label="Decrease quantity"
            variant="outline"
            size="sm"
            onClick={handleDecrement}
            disabled={quantity <= 1}
          />
          <span className="w-10 text-center font-medium text-sm">
            {quantity}
          </span>
          <IconButton
            icon={<Plus className="w-4 h-4" />}
            aria-label="Increase quantity"
            variant="outline"
            size="sm"
            onClick={handleIncrement}
            disabled={quantity >= 9999}
          />
        </div>

        <IconButton
          icon={<X className="w-4 h-4" />}
          aria-label={`Remove ${item.name}`}
          variant="ghost"
          size="sm"
          onClick={handleRemove}
          className="flex-shrink-0 text-foreground-muted hover:text-error"
        />
      </div>
    );
  }
);

BatchItemRow.displayName = "BatchItemRow";

export default BatchItemRow;
