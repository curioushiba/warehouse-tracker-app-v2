"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { Size } from "@/types";

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  min?: number;
  max?: number;
  size?: Size;
  colorScheme?: "primary" | "success" | "warning" | "error";
  isIndeterminate?: boolean;
  hasStripe?: boolean;
  isAnimated?: boolean;
  showValue?: boolean;
  valueFormat?: (value: number) => string;
  borderRadius?: "none" | "sm" | "md" | "lg" | "full";
  "aria-label"?: string;
}

const sizeClasses: Record<Size, string> = {
  xs: "h-1",
  sm: "h-1.5",
  md: "h-2",
  lg: "h-3",
  xl: "h-4",
  "2xl": "h-5",
};

const colorClasses = {
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  error: "bg-error",
};

const radiusClasses = {
  none: "rounded-none",
  sm: "rounded-sm",
  md: "rounded",
  lg: "rounded-lg",
  full: "rounded-full",
};

export const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  (
    {
      className,
      value = 0,
      min = 0,
      max = 100,
      size = "md",
      colorScheme = "primary",
      isIndeterminate = false,
      hasStripe = false,
      isAnimated = false,
      showValue = false,
      valueFormat = (v) => `${Math.round(v)}%`,
      borderRadius = "full",
      "aria-label": ariaLabel,
      ...props
    },
    ref
  ) => {
    const percentage = Math.min(
      100,
      Math.max(0, ((value - min) / (max - min)) * 100)
    );

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuenow={isIndeterminate ? undefined : value}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-label={ariaLabel}
        className={cn("relative w-full", className)}
        {...props}
      >
        {/* Track */}
        <div
          className={cn(
            "w-full bg-neutral-200 overflow-hidden",
            sizeClasses[size],
            radiusClasses[borderRadius]
          )}
        >
          {/* Filled Track */}
          <div
            className={cn(
              "h-full transition-all duration-300 ease-out",
              colorClasses[colorScheme],
              radiusClasses[borderRadius],
              isIndeterminate && "animate-[progress-indeterminate_1.5s_ease-in-out_infinite] w-1/3",
              hasStripe &&
                "bg-[length:1rem_1rem] bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)]",
              isAnimated && hasStripe && "animate-[progress-stripe_1s_linear_infinite]"
            )}
            style={
              !isIndeterminate
                ? { width: `${percentage}%` }
                : undefined
            }
          />
        </div>

        {/* Value Display */}
        {showValue && !isIndeterminate && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className={cn(
                "font-medium",
                size === "xs" || size === "sm" ? "text-[10px]" : "text-xs"
              )}
            >
              {valueFormat(value)}
            </span>
          </div>
        )}
      </div>
    );
  }
);

Progress.displayName = "Progress";

// Circular Progress
export interface CircularProgressProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "aria-label"> {
  value?: number;
  min?: number;
  max?: number;
  size?: number;
  thickness?: number;
  colorScheme?: "primary" | "success" | "warning" | "error";
  isIndeterminate?: boolean;
  showValue?: boolean;
  valueFormat?: (value: number) => string;
  "aria-label": string;
}

export const CircularProgress = React.forwardRef<
  HTMLDivElement,
  CircularProgressProps
>(
  (
    {
      className,
      value = 0,
      min = 0,
      max = 100,
      size = 48,
      thickness = 4,
      colorScheme = "primary",
      isIndeterminate = false,
      showValue = false,
      valueFormat = (v) => `${Math.round(v)}%`,
      "aria-label": ariaLabel,
      ...props
    },
    ref
  ) => {
    const percentage = Math.min(
      100,
      Math.max(0, ((value - min) / (max - min)) * 100)
    );
    const radius = (size - thickness) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    const strokeColorClasses = {
      primary: "stroke-primary",
      success: "stroke-success",
      warning: "stroke-warning",
      error: "stroke-error",
    };

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuenow={isIndeterminate ? undefined : value}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-label={ariaLabel}
        className={cn("relative inline-flex items-center justify-center", className)}
        style={{ width: size, height: size }}
        {...props}
      >
        <svg
          className={cn(
            "transform -rotate-90",
            isIndeterminate && "animate-spin"
          )}
          width={size}
          height={size}
        >
          {/* Background circle */}
          <circle
            className="stroke-neutral-200"
            fill="transparent"
            strokeWidth={thickness}
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
          {/* Progress circle */}
          <circle
            className={cn(
              strokeColorClasses[colorScheme],
              "transition-all duration-300"
            )}
            fill="transparent"
            strokeWidth={thickness}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={isIndeterminate ? circumference * 0.75 : strokeDashoffset}
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
        </svg>

        {/* Value Display */}
        {showValue && !isIndeterminate && (
          <span className="absolute text-xs font-medium">
            {valueFormat(value)}
          </span>
        )}
      </div>
    );
  }
);

CircularProgress.displayName = "CircularProgress";

export default Progress;
