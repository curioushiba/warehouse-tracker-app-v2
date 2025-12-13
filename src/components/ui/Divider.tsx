"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface DividerProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical";
  variant?: "solid" | "dashed" | "dotted";
  size?: "thin" | "medium" | "thick";
  label?: React.ReactNode;
  labelPosition?: "start" | "center" | "end";
}

const sizeClasses = {
  horizontal: {
    thin: "h-px",
    medium: "h-0.5",
    thick: "h-1",
  },
  vertical: {
    thin: "w-px",
    medium: "w-0.5",
    thick: "w-1",
  },
};

const variantClasses = {
  solid: "border-solid",
  dashed: "border-dashed",
  dotted: "border-dotted",
};

export const Divider = React.forwardRef<HTMLDivElement, DividerProps>(
  (
    {
      className,
      orientation = "horizontal",
      variant = "solid",
      size = "thin",
      label,
      labelPosition = "center",
      ...props
    },
    ref
  ) => {
    const isHorizontal = orientation === "horizontal";

    if (label) {
      const labelPositionClasses = {
        start: "justify-start",
        center: "justify-center",
        end: "justify-end",
      };

      return (
        <div
          ref={ref}
          role="separator"
          aria-orientation={orientation}
          className={cn(
            "flex items-center gap-4",
            labelPositionClasses[labelPosition],
            className
          )}
          {...props}
        >
          <div
            className={cn(
              "flex-1 bg-border",
              sizeClasses[orientation][size],
              labelPosition !== "start" && "flex-1",
              labelPosition === "start" && "flex-none w-8"
            )}
          />
          <span className="text-sm text-foreground-muted font-medium px-2">
            {label}
          </span>
          <div
            className={cn(
              "flex-1 bg-border",
              sizeClasses[orientation][size],
              labelPosition !== "end" && "flex-1",
              labelPosition === "end" && "flex-none w-8"
            )}
          />
        </div>
      );
    }

    return (
      <div
        ref={ref}
        role="separator"
        aria-orientation={orientation}
        className={cn(
          "bg-border",
          isHorizontal ? "w-full" : "h-full self-stretch",
          sizeClasses[orientation][size],
          variantClasses[variant],
          className
        )}
        {...props}
      />
    );
  }
);

Divider.displayName = "Divider";

export default Divider;
