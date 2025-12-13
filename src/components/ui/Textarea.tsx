"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { InputVariant, Size } from "@/types";

export interface TextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "size"> {
  variant?: InputVariant;
  size?: Size;
  isInvalid?: boolean;
  isReadOnly?: boolean;
  resize?: "none" | "vertical" | "horizontal" | "both";
  showCount?: boolean;
  maxLength?: number;
}

const variantClasses: Record<InputVariant, string> = {
  outline:
    "bg-white border border-border rounded-input hover:border-primary focus:border-primary focus:ring-2 focus:ring-primary/20",
  filled:
    "bg-background-tertiary border-2 border-transparent rounded-input hover:bg-background-sunken focus:bg-white focus:border-primary",
  flushed:
    "bg-transparent border-0 border-b border-border rounded-none px-0 focus:border-b-2 focus:border-primary",
};

const sizeClasses: Record<Size, string> = {
  xs: "px-2 py-1.5 text-xs min-h-[60px]",
  sm: "px-3 py-2 text-[13px] min-h-[80px]",
  md: "px-3 py-2.5 text-sm min-h-[100px]",
  lg: "px-4 py-3 text-base min-h-[120px]",
  xl: "px-5 py-4 text-lg min-h-[150px]",
  "2xl": "px-6 py-5 text-xl min-h-[180px]",
};

const resizeClasses = {
  none: "resize-none",
  vertical: "resize-y",
  horizontal: "resize-x",
  both: "resize",
};

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      variant = "outline",
      size = "md",
      isInvalid = false,
      isReadOnly = false,
      resize = "vertical",
      showCount = false,
      maxLength,
      disabled,
      value,
      ...props
    },
    ref
  ) => {
    const charCount = typeof value === "string" ? value.length : 0;

    return (
      <div className="relative w-full">
        <textarea
          ref={ref}
          className={cn(
            // Base styles
            "w-full font-body text-foreground transition-colors duration-150 focus:outline-none",
            "placeholder:text-foreground-placeholder",
            // Variant styles
            variantClasses[variant],
            // Size styles
            sizeClasses[size],
            // Resize
            resizeClasses[resize],
            // State styles
            isInvalid && "border-error focus:ring-error/20",
            isReadOnly && "bg-neutral-50 cursor-default",
            disabled && "bg-neutral-100 text-foreground-disabled cursor-not-allowed opacity-100",
            // Account for character counter
            showCount && "pb-6",
            className
          )}
          disabled={disabled}
          readOnly={isReadOnly}
          maxLength={maxLength}
          value={value}
          aria-invalid={isInvalid}
          {...props}
        />
        {showCount && (
          <div className="absolute bottom-2 right-3 text-xs text-foreground-muted">
            {charCount}
            {maxLength && ` / ${maxLength}`}
          </div>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

export default Textarea;
