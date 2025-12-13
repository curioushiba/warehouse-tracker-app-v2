"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "pulse" | "wave";
  width?: string | number;
  height?: string | number;
  borderRadius?: "none" | "sm" | "md" | "lg" | "full";
  isLoaded?: boolean;
}

const radiusClasses = {
  none: "rounded-none",
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  full: "rounded-full",
};

export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  (
    {
      className,
      variant = "pulse",
      width,
      height,
      borderRadius = "md",
      isLoaded = false,
      children,
      style,
      ...props
    },
    ref
  ) => {
    if (isLoaded) {
      return <>{children}</>;
    }

    return (
      <div
        ref={ref}
        aria-hidden="true"
        className={cn(
          "bg-neutral-200",
          radiusClasses[borderRadius],
          variant === "pulse" && "animate-pulse",
          variant === "wave" && "shimmer",
          className
        )}
        style={{
          width: typeof width === "number" ? `${width}px` : width,
          height: typeof height === "number" ? `${height}px` : height,
          ...style,
        }}
        {...props}
      />
    );
  }
);

Skeleton.displayName = "Skeleton";

// Skeleton Text - for text line placeholders
export interface SkeletonTextProps {
  lines?: number;
  spacing?: "sm" | "md" | "lg";
  variant?: "pulse" | "wave";
  className?: string;
}

export const SkeletonText: React.FC<SkeletonTextProps> = ({
  lines = 3,
  spacing = "sm",
  variant = "pulse",
  className,
}) => {
  const spacingClasses = {
    sm: "space-y-2",
    md: "space-y-3",
    lg: "space-y-4",
  };

  return (
    <div className={cn(spacingClasses[spacing], className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant={variant}
          height={16}
          width={i === lines - 1 ? "60%" : "100%"}
          borderRadius="sm"
        />
      ))}
    </div>
  );
};

// Skeleton Circle - for avatar placeholders
export interface SkeletonCircleProps {
  size?: number;
  variant?: "pulse" | "wave";
  className?: string;
}

export const SkeletonCircle: React.FC<SkeletonCircleProps> = ({
  size = 40,
  variant = "pulse",
  className,
}) => {
  return (
    <Skeleton
      variant={variant}
      width={size}
      height={size}
      borderRadius="full"
      className={className}
    />
  );
};

// Card Skeleton - for card placeholders
export const SkeletonCard: React.FC<{ className?: string }> = ({
  className,
}) => {
  return (
    <div
      className={cn(
        "bg-white rounded-card p-6 shadow-sm space-y-4",
        className
      )}
    >
      <div className="flex items-center gap-4">
        <SkeletonCircle size={48} />
        <div className="flex-1 space-y-2">
          <Skeleton height={20} width="60%" />
          <Skeleton height={14} width="40%" />
        </div>
      </div>
      <SkeletonText lines={3} />
      <div className="flex gap-2">
        <Skeleton height={36} width={100} borderRadius="lg" />
        <Skeleton height={36} width={100} borderRadius="lg" />
      </div>
    </div>
  );
};

// Table Row Skeleton
export const SkeletonTableRow: React.FC<{
  columns?: number;
  className?: string;
}> = ({ columns = 5, className }) => {
  return (
    <tr className={className}>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton height={16} width={i === 0 ? "80%" : "60%"} />
        </td>
      ))}
    </tr>
  );
};

export default Skeleton;
