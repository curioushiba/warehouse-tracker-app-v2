"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import type { ButtonVariant, Size } from "@/types";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: Size;
  isLoading?: boolean;
  isFullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  loadingText?: string;
}

const variantClasses: Record<ButtonVariant, string> = {
  cta: "bg-cta text-foreground hover:bg-cta-hover active:bg-cta-active shadow-md hover:shadow-lg hover:-translate-y-0.5 focus:ring-cta/30",
  primary:
    "bg-primary text-white hover:bg-primary-600 active:bg-primary-700 focus:ring-primary/30",
  secondary:
    "bg-secondary text-foreground hover:bg-secondary-600 border border-border focus:ring-primary/30",
  outline:
    "bg-transparent border-2 border-primary text-primary hover:bg-primary hover:text-white focus:ring-primary/30",
  ghost:
    "bg-transparent text-foreground hover:bg-neutral-100 focus:ring-primary/30",
  danger:
    "bg-error text-white hover:bg-error-dark focus:ring-error/30",
  link: "bg-transparent text-primary hover:text-primary-600 underline-offset-4 hover:underline p-0 h-auto focus:ring-0",
};

const sizeClasses: Record<Size, string> = {
  xs: "h-7 px-2.5 text-xs gap-1",
  sm: "h-8 px-3 text-sm gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-11 px-5 text-base gap-2",
  xl: "h-12 px-6 text-base gap-2.5",
  "2xl": "h-14 px-8 text-lg gap-3",
};

const iconSizeClasses: Record<Size, string> = {
  xs: "w-3 h-3",
  sm: "w-3.5 h-3.5",
  md: "w-4 h-4",
  lg: "w-5 h-5",
  xl: "w-5 h-5",
  "2xl": "w-6 h-6",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      isFullWidth = false,
      leftIcon,
      rightIcon,
      loadingText,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        className={cn(
          // Base styles
          "inline-flex items-center justify-center font-medium transition-all duration-200",
          "rounded-button focus:outline-none focus:ring-2",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none",
          // Variant styles
          variantClasses[variant],
          // Size styles (except for link variant)
          variant !== "link" && sizeClasses[size],
          // Full width
          isFullWidth && "w-full",
          className
        )}
        disabled={isDisabled}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className={cn("animate-spin", iconSizeClasses[size])} />
            {loadingText && <span>{loadingText}</span>}
          </>
        ) : (
          <>
            {leftIcon && (
              <span className={cn("flex-shrink-0", iconSizeClasses[size])}>
                {leftIcon}
              </span>
            )}
            {children}
            {rightIcon && (
              <span className={cn("flex-shrink-0", iconSizeClasses[size])}>
                {rightIcon}
              </span>
            )}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

// IconButton Component
export interface IconButtonProps
  extends Omit<ButtonProps, "leftIcon" | "rightIcon" | "loadingText" | "children"> {
  icon: React.ReactNode;
  "aria-label": string;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, size = "md", icon, variant = "ghost", ...props }, ref) => {
    const squareSizeClasses: Record<Size, string> = {
      xs: "h-7 w-7",
      sm: "h-8 w-8",
      md: "h-10 w-10",
      lg: "h-11 w-11",
      xl: "h-12 w-12",
      "2xl": "h-14 w-14",
    };

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-all duration-200",
          "rounded-button focus:outline-none focus:ring-2",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          variantClasses[variant],
          squareSizeClasses[size],
          "p-0",
          className
        )}
        {...props}
      >
        <span className={iconSizeClasses[size]}>{icon}</span>
      </button>
    );
  }
);

IconButton.displayName = "IconButton";

export default Button;
