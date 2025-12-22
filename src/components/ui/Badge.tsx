"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { Size, BadgeVariant, BadgeColorScheme } from "@/types";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  colorScheme?: BadgeColorScheme;
  size?: Size;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const colorSchemeClasses: Record<
  BadgeColorScheme,
  { solid: string; subtle: string; outline: string }
> = {
  primary: {
    solid: "bg-primary text-white",
    subtle: "bg-primary-50 text-primary",
    outline: "border-primary text-primary bg-transparent",
  },
  secondary: {
    solid: "bg-secondary text-foreground",
    subtle: "bg-secondary-200 text-foreground",
    outline: "border-secondary-600 text-foreground bg-transparent",
  },
  success: {
    solid: "bg-success text-white",
    subtle: "bg-success-light text-success-dark",
    outline: "border-success text-success bg-transparent",
  },
  warning: {
    solid: "bg-warning text-foreground",
    subtle: "bg-warning-light text-warning-dark",
    outline: "border-warning text-warning-dark bg-transparent",
  },
  error: {
    solid: "bg-error text-white",
    subtle: "bg-error-light text-error-dark",
    outline: "border-error text-error bg-transparent",
  },
  info: {
    solid: "bg-info text-white",
    subtle: "bg-info-light text-info-dark",
    outline: "border-info text-info bg-transparent",
  },
  neutral: {
    solid: "bg-neutral-600 text-white",
    subtle: "bg-neutral-100 text-neutral-700",
    outline: "border-neutral-400 text-neutral-600 bg-transparent",
  },
};

const sizeClasses: Record<Size, string> = {
  xs: "px-1.5 py-0.5 text-[10px]",
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-0.5 text-xs",
  lg: "px-3 py-1 text-sm",
  xl: "px-3.5 py-1 text-sm",
  "2xl": "px-4 py-1.5 text-base",
};

const iconSizeClasses: Record<Size, string> = {
  xs: "w-2.5 h-2.5",
  sm: "w-3 h-3",
  md: "w-3.5 h-3.5",
  lg: "w-4 h-4",
  xl: "w-4 h-4",
  "2xl": "w-5 h-5",
};

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      className,
      variant = "subtle",
      colorScheme = "neutral",
      size = "md",
      leftIcon,
      rightIcon,
      children,
      ...props
    },
    ref
  ) => {
    const colors = colorSchemeClasses[colorScheme];
    const variantClass = colors[variant];

    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center gap-2 font-medium rounded-full whitespace-nowrap",
          variant === "outline" && "border",
          sizeClasses[size],
          variantClass,
          className
        )}
        {...props}
      >
        {leftIcon && (
          <span className={iconSizeClasses[size]}>{leftIcon}</span>
        )}
        {children}
        {rightIcon && (
          <span className={iconSizeClasses[size]}>{rightIcon}</span>
        )}
      </span>
    );
  }
);

Badge.displayName = "Badge";

// Dot Badge - for status indicators
export interface DotBadgeProps extends Omit<BadgeProps, "leftIcon" | "rightIcon"> {
  showDot?: boolean;
  dotPosition?: "left" | "right";
  pulse?: boolean;
}

export const DotBadge = React.forwardRef<HTMLSpanElement, DotBadgeProps>(
  (
    {
      className,
      colorScheme = "neutral",
      showDot = true,
      dotPosition = "left",
      pulse = false,
      children,
      ...props
    },
    ref
  ) => {
    const dotColorClasses: Record<BadgeColorScheme, string> = {
      primary: "bg-primary",
      secondary: "bg-foreground",
      success: "bg-success",
      warning: "bg-warning",
      error: "bg-error",
      info: "bg-info",
      neutral: "bg-neutral-500",
    };

    const dot = showDot && (
      <span className={cn("relative", pulse && "flex")}>
        <span
          className={cn(
            "w-2 h-2 rounded-full",
            dotColorClasses[colorScheme]
          )}
        />
        {pulse && (
          <span
            className={cn(
              "absolute inset-0 w-2 h-2 rounded-full animate-ping opacity-75",
              dotColorClasses[colorScheme]
            )}
          />
        )}
      </span>
    );

    return (
      <Badge
        ref={ref}
        colorScheme={colorScheme}
        leftIcon={dotPosition === "left" ? dot : undefined}
        rightIcon={dotPosition === "right" ? dot : undefined}
        className={className}
        {...props}
      >
        {children}
      </Badge>
    );
  }
);

DotBadge.displayName = "DotBadge";

export default Badge;
