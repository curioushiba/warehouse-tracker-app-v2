"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Info,
  CheckCircle,
  AlertTriangle,
  XCircle,
  X,
} from "lucide-react";
import type { AlertStatus, AlertVariant } from "@/types";

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  status?: AlertStatus;
  variant?: AlertVariant;
  title?: string;
  icon?: React.ReactNode;
  isClosable?: boolean;
  onClose?: () => void;
}

const statusConfig: Record<
  AlertStatus,
  {
    icon: React.ReactNode;
    subtle: string;
    solid: string;
    leftAccent: string;
    topAccent: string;
  }
> = {
  info: {
    icon: <Info className="w-5 h-5" />,
    subtle: "bg-info-light text-info-dark",
    solid: "bg-info text-white",
    leftAccent: "border-l-4 border-l-info bg-info-light text-info-dark",
    topAccent: "border-t-4 border-t-info bg-info-light text-info-dark",
  },
  success: {
    icon: <CheckCircle className="w-5 h-5" />,
    subtle: "bg-success-light text-success-dark",
    solid: "bg-success text-white",
    leftAccent: "border-l-4 border-l-success bg-success-light text-success-dark",
    topAccent: "border-t-4 border-t-success bg-success-light text-success-dark",
  },
  warning: {
    icon: <AlertTriangle className="w-5 h-5" />,
    subtle: "bg-warning-light text-warning-dark",
    solid: "bg-warning text-foreground",
    leftAccent: "border-l-4 border-l-warning bg-warning-light text-warning-dark",
    topAccent: "border-t-4 border-t-warning bg-warning-light text-warning-dark",
  },
  error: {
    icon: <XCircle className="w-5 h-5" />,
    subtle: "bg-error-light text-error-dark",
    solid: "bg-error text-white",
    leftAccent: "border-l-4 border-l-error bg-error-light text-error-dark",
    topAccent: "border-t-4 border-t-error bg-error-light text-error-dark",
  },
};

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  (
    {
      className,
      status = "info",
      variant = "subtle",
      title,
      icon,
      isClosable = false,
      onClose,
      children,
      ...props
    },
    ref
  ) => {
    const config = statusConfig[status];
    const variantClass =
      variant === "subtle"
        ? config.subtle
        : variant === "solid"
        ? config.solid
        : variant === "left-accent"
        ? config.leftAccent
        : config.topAccent;

    return (
      <div
        ref={ref}
        role="alert"
        aria-live="polite"
        className={cn(
          "flex items-start gap-3 p-4 rounded-lg",
          variantClass,
          className
        )}
        {...props}
      >
        {/* Icon */}
        <span className="flex-shrink-0 mt-0.5" aria-hidden="true">
          {icon || config.icon}
        </span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {title && <p className="font-semibold mb-1">{title}</p>}
          {children && <p className="text-sm">{children}</p>}
        </div>

        {/* Close Button */}
        {isClosable && (
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "flex-shrink-0 p-1 -mr-1 -mt-1 rounded transition-colors",
              variant === "solid"
                ? "hover:bg-white/20"
                : "hover:bg-black/5"
            )}
            aria-label="Close alert"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }
);

Alert.displayName = "Alert";

export default Alert;
