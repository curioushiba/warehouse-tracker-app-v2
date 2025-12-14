"use client";

import * as React from "react";
import { Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { BatchItemRow } from "./BatchItemRow";
import type { BatchItem } from "@/contexts/BatchScanContext";

export interface BatchMiniListProps {
  items: BatchItem[];
  onRemove?: (itemId: string) => void;
  maxVisibleItems?: number;
  className?: string;
}

export const BatchMiniList = React.forwardRef<HTMLDivElement, BatchMiniListProps>(
  ({ items, onRemove, maxVisibleItems = 4, className }, ref) => {
    const listRef = React.useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when new items are added
    React.useEffect(() => {
      if (listRef.current) {
        listRef.current.scrollTop = listRef.current.scrollHeight;
      }
    }, [items.length]);

    if (items.length === 0) {
      return (
        <div
          ref={ref}
          className={cn(
            "flex flex-col items-center justify-center py-6 text-center",
            className
          )}
        >
          <Package className="w-8 h-8 text-foreground-muted mb-2" />
          <p className="text-sm text-foreground-muted">
            Scan items to add them to your list
          </p>
        </div>
      );
    }

    return (
      <div ref={ref} className={cn("flex flex-col", className)}>
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-sm font-medium text-foreground">
            Scanned Items
          </span>
          <span className="text-sm text-foreground-muted">
            {items.length} item{items.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div
          ref={listRef}
          className="flex flex-col gap-1.5 overflow-y-auto"
          style={{ maxHeight: `${maxVisibleItems * 44}px` }}
        >
          {items.map((batchItem) => (
            <BatchItemRow
              key={batchItem.itemId}
              batchItem={batchItem}
              variant="compact"
              onRemove={onRemove}
            />
          ))}
        </div>
      </div>
    );
  }
);

BatchMiniList.displayName = "BatchMiniList";

export default BatchMiniList;
