"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { Size } from "@/types";

export interface SwitchProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size" | "type"> {
  size?: Size;
  isChecked?: boolean;
  colorScheme?: "primary" | "success";
  label?: React.ReactNode;
  labelPosition?: "left" | "right";
}

const sizeClasses: Record<
  Size,
  { track: string; thumb: string; thumbOn: string; label: string }
> = {
  xs: {
    track: "w-6 h-3.5",
    thumb: "w-2.5 h-2.5",
    thumbOn: "translate-x-2.5",
    label: "text-xs",
  },
  sm: {
    track: "w-7 h-4",
    thumb: "w-3 h-3",
    thumbOn: "translate-x-3",
    label: "text-sm",
  },
  md: {
    track: "w-9 h-5",
    thumb: "w-4 h-4",
    thumbOn: "translate-x-4",
    label: "text-sm",
  },
  lg: {
    track: "w-11 h-6",
    thumb: "w-5 h-5",
    thumbOn: "translate-x-5",
    label: "text-base",
  },
  xl: {
    track: "w-14 h-7",
    thumb: "w-6 h-6",
    thumbOn: "translate-x-7",
    label: "text-base",
  },
  "2xl": {
    track: "w-16 h-8",
    thumb: "w-7 h-7",
    thumbOn: "translate-x-8",
    label: "text-lg",
  },
};

const colorSchemeClasses = {
  primary: "bg-primary",
  success: "bg-success",
};

export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  (
    {
      className,
      size = "md",
      isChecked,
      colorScheme = "primary",
      label,
      labelPosition = "right",
      disabled,
      defaultChecked,
      onChange,
      ...props
    },
    ref
  ) => {
    const [internalChecked, setInternalChecked] = React.useState(
      defaultChecked || false
    );
    const checked = isChecked !== undefined ? isChecked : internalChecked;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (isChecked === undefined) {
        setInternalChecked(e.target.checked);
      }
      onChange?.(e);
    };

    const sizes = sizeClasses[size];

    const switchControl = (
      <span
        className={cn(
          "relative inline-flex flex-shrink-0 rounded-full transition-colors duration-200 cursor-pointer",
          sizes.track,
          checked ? colorSchemeClasses[colorScheme] : "bg-neutral-300",
          !disabled && !checked && "hover:bg-neutral-400",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        aria-hidden="true"
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 bg-white rounded-full shadow-sm transition-transform duration-200",
            sizes.thumb,
            checked && sizes.thumbOn
          )}
        />
      </span>
    );

    return (
      <label
        className={cn(
          "inline-flex items-center gap-2 cursor-pointer",
          disabled && "cursor-not-allowed",
          className
        )}
      >
        {/* Hidden checkbox input */}
        <input
          ref={ref}
          type="checkbox"
          role="switch"
          className="sr-only"
          checked={checked}
          disabled={disabled}
          onChange={handleChange}
          aria-checked={checked}
          {...props}
        />

        {labelPosition === "left" && label && (
          <span
            className={cn(
              "text-foreground select-none",
              sizes.label,
              disabled && "text-foreground-disabled"
            )}
          >
            {label}
          </span>
        )}

        {switchControl}

        {labelPosition === "right" && label && (
          <span
            className={cn(
              "text-foreground select-none",
              sizes.label,
              disabled && "text-foreground-disabled"
            )}
          >
            {label}
          </span>
        )}
      </label>
    );
  }
);

Switch.displayName = "Switch";

export default Switch;
