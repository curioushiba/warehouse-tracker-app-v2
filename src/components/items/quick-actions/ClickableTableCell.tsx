"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface ClickableTableCellProps {
  onClick: () => void;
  children: React.ReactNode;
  ariaLabel: string;
  className?: string;
}

export const ClickableTableCell = React.forwardRef<
  HTMLSpanElement,
  ClickableTableCellProps
>(({ onClick, children, ariaLabel, className }, ref) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <span
      ref={ref}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      aria-label={ariaLabel}
      className={cn(
        "cursor-pointer hover:bg-primary-50 rounded px-1 -mx-1",
        "focus:outline-none focus:ring-2 focus:ring-primary/50",
        "transition-colors inline-block",
        className
      )}
    >
      {children}
    </span>
  );
});

ClickableTableCell.displayName = "ClickableTableCell";

export default ClickableTableCell;
