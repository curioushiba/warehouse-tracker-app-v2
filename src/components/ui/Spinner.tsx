"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { Size } from "@/types";

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: Size;
  color?: "primary" | "secondary" | "white" | "current";
  thickness?: number;
  speed?: "slow" | "normal" | "fast";
  label?: string;
}

const sizeClasses: Record<Size, string> = {
  xs: "w-3 h-3",
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8",
  xl: "w-10 h-10",
  "2xl": "w-12 h-12",
};

const colorClasses = {
  primary: "border-primary",
  secondary: "border-foreground",
  white: "border-white",
  current: "border-current",
};

const speedClasses = {
  slow: "animate-[spin_1.5s_linear_infinite]",
  normal: "animate-spin",
  fast: "animate-[spin_0.5s_linear_infinite]",
};

export const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  (
    {
      className,
      size = "md",
      color = "primary",
      thickness = 2,
      speed = "normal",
      label = "Loading...",
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        role="status"
        aria-label={label}
        className={cn(
          "inline-block rounded-full border-transparent",
          sizeClasses[size],
          colorClasses[color],
          speedClasses[speed],
          className
        )}
        style={{
          borderWidth: thickness,
          borderTopColor: "currentColor",
          borderRightColor: "currentColor",
          borderBottomColor: "transparent",
          borderLeftColor: "transparent",
        }}
        {...props}
      >
        <span className="sr-only">{label}</span>
      </div>
    );
  }
);

Spinner.displayName = "Spinner";

// Full page loading spinner
export interface LoadingOverlayProps {
  isLoading: boolean;
  label?: string;
  fullScreen?: boolean;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  label = "Loading...",
  fullScreen = false,
}) => {
  if (!isLoading) return null;

  return (
    <div
      className={cn(
        "flex items-center justify-center bg-white/80 backdrop-blur-xs z-50",
        fullScreen ? "fixed inset-0" : "absolute inset-0"
      )}
    >
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg" />
        <span className="text-sm text-foreground-muted">{label}</span>
      </div>
    </div>
  );
};

export default Spinner;
