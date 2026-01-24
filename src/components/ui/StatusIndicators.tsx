"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Wifi,
  WifiOff,
  Cloud,
  CloudOff,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Package,
  AlertTriangle,
} from "lucide-react";
import type { StockLevel, SyncStatus } from "@/types";
import { Badge, DotBadge } from "./Badge";

// Online/Offline Indicator
export interface OnlineIndicatorProps {
  isOnline: boolean;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const OnlineIndicator: React.FC<OnlineIndicatorProps> = ({
  isOnline,
  showLabel = true,
  size = "md",
  className,
}) => {
  const sizeClasses = {
    sm: { dot: "w-2 h-2", icon: "w-3 h-3", text: "text-xs" },
    md: { dot: "w-2.5 h-2.5", icon: "w-4 h-4", text: "text-sm" },
    lg: { dot: "w-3 h-3", icon: "w-5 h-5", text: "text-base" },
  };

  const sizes = sizeClasses[size];

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <span className="relative flex">
        <span
          className={cn(
            "rounded-full",
            sizes.dot,
            isOnline ? "bg-success" : "bg-neutral-400"
          )}
        />
        {isOnline && (
          <span
            className={cn(
              "absolute inset-0 rounded-full bg-success animate-ping opacity-75",
              sizes.dot
            )}
          />
        )}
      </span>
      {showLabel && (
        <span
          className={cn(
            sizes.text,
            isOnline ? "text-success-dark" : "text-neutral-500"
          )}
        >
          {isOnline ? "Online" : "Offline"}
        </span>
      )}
    </div>
  );
};

// Sync Status Indicator
export interface SyncStatusIndicatorProps {
  status: SyncStatus;
  showLabel?: boolean;
  size?: "xs" | "sm" | "md" | "lg";
  lastSyncTime?: Date | string;
  className?: string;
}

const syncStatusConfig: Record<
  SyncStatus,
  {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    colorClass: string;
    badgeColor: "success" | "warning" | "neutral" | "error";
    animate?: boolean;
  }
> = {
  synced: {
    icon: Cloud,
    label: "Synced",
    colorClass: "text-success",
    badgeColor: "success",
  },
  syncing: {
    icon: RefreshCw,
    label: "Syncing",
    colorClass: "text-primary",
    badgeColor: "warning",
    animate: true,
  },
  pending: {
    icon: RefreshCw,
    label: "Pending",
    colorClass: "text-warning",
    badgeColor: "warning",
    animate: true,
  },
  offline: {
    icon: CloudOff,
    label: "Offline",
    colorClass: "text-neutral-500",
    badgeColor: "neutral",
  },
  error: {
    icon: AlertCircle,
    label: "Sync Error",
    colorClass: "text-error",
    badgeColor: "error",
  },
};

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  status,
  showLabel = true,
  size = "md",
  lastSyncTime,
  className,
}) => {
  const config = syncStatusConfig[status];
  const IconComponent = config.icon;

  const sizeClasses = {
    xs: { icon: "w-2.5 h-2.5", text: "text-[10px]" },
    sm: { icon: "w-3 h-3", text: "text-xs" },
    md: { icon: "w-4 h-4", text: "text-sm" },
    lg: { icon: "w-5 h-5", text: "text-base" },
  };

  const sizes = sizeClasses[size];

  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      <IconComponent
        className={cn(
          sizes.icon,
          config.colorClass,
          config.animate && "animate-spin"
        )}
      />
      {showLabel && (
        <span className={cn(sizes.text, config.colorClass)}>
          {config.label}
        </span>
      )}
      {lastSyncTime && status === "synced" && (
        <span className={cn(sizes.text, "text-foreground-muted ml-1")}>
          {typeof lastSyncTime === "string"
            ? lastSyncTime
            : lastSyncTime.toLocaleTimeString()}
        </span>
      )}
    </div>
  );
};

// Stock Level Badge
export interface StockLevelBadgeProps {
  level: StockLevel;
  currentStock?: number;
  showIcon?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const stockLevelConfig: Record<
  StockLevel,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    colorScheme: "error" | "warning" | "success" | "info";
    hideIcon?: boolean;
  }
> = {
  critical: {
    label: "Critical",
    icon: AlertCircle,
    colorScheme: "error",
  },
  low: {
    label: "Low Stock",
    icon: AlertTriangle,
    colorScheme: "error",
    hideIcon: true,
  },
  normal: {
    label: "In Stock",
    icon: CheckCircle,
    colorScheme: "success",
  },
  overstocked: {
    label: "Overstocked",
    icon: Package,
    colorScheme: "info",
  },
};

export const StockLevelBadge: React.FC<StockLevelBadgeProps> = ({
  level,
  currentStock,
  showIcon = true,
  size = "md",
  className,
}) => {
  const config = stockLevelConfig[level];
  const IconComponent = config.icon;
  const shouldShowIcon = showIcon && !config.hideIcon;

  return (
    <Badge
      colorScheme={config.colorScheme}
      variant="subtle"
      size={size}
      leftIcon={shouldShowIcon ? <IconComponent /> : undefined}
      className={className}
    >
      {currentStock !== undefined ? `${currentStock} - ${config.label}` : config.label}
    </Badge>
  );
};

// Quantity Badge - shows current stock with color coding
export interface QuantityBadgeProps {
  quantity: number;
  minStock?: number;
  maxStock?: number;
  showLevel?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const QuantityBadge: React.FC<QuantityBadgeProps> = ({
  quantity,
  minStock = 0,
  maxStock = 100,
  showLevel = false,
  size = "md",
  className,
}) => {
  let level: StockLevel = "normal";
  if (quantity <= 0) level = "critical";
  else if (quantity <= minStock) level = "low";
  else if (quantity >= maxStock) level = "overstocked";

  const config = stockLevelConfig[level];

  if (showLevel) {
    return (
      <StockLevelBadge
        level={level}
        currentStock={quantity}
        size={size}
        className={className}
      />
    );
  }

  return (
    <Badge
      colorScheme={config.colorScheme}
      variant="subtle"
      size={size}
      className={className}
    >
      {quantity}
    </Badge>
  );
};

// Connection Status Bar - for mobile header
export interface ConnectionStatusBarProps {
  isOnline: boolean;
  syncStatus: SyncStatus;
  pendingCount?: number;
  pendingEditsCount?: number;
  pendingImagesCount?: number;
  className?: string;
}

export const ConnectionStatusBar: React.FC<ConnectionStatusBarProps> = ({
  isOnline,
  syncStatus,
  pendingCount = 0,
  pendingEditsCount = 0,
  pendingImagesCount = 0,
  className,
}) => {
  const totalPending = pendingCount + pendingEditsCount + pendingImagesCount;

  if (isOnline && syncStatus === "synced" && totalPending === 0) return null;

  // Build pending description
  const pendingParts: string[] = [];
  if (pendingCount > 0) {
    pendingParts.push(`${pendingCount} ${pendingCount === 1 ? "transaction" : "transactions"}`);
  }
  if (pendingEditsCount > 0) {
    pendingParts.push(`${pendingEditsCount} ${pendingEditsCount === 1 ? "edit" : "edits"}`);
  }
  if (pendingImagesCount > 0) {
    pendingParts.push(`${pendingImagesCount} ${pendingImagesCount === 1 ? "image" : "images"}`);
  }
  const pendingDescription = pendingParts.join(", ");

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-2 py-2 px-4 text-sm",
        !isOnline
          ? "bg-neutral-100 text-neutral-600"
          : syncStatus === "pending"
          ? "bg-warning-light text-warning-dark"
          : syncStatus === "error"
          ? "bg-error-light text-error-dark"
          : "bg-success-light text-success-dark",
        className
      )}
    >
      {!isOnline ? (
        <>
          <WifiOff className="w-4 h-4" />
          <span>You are offline</span>
          {totalPending > 0 && (
            <span className="font-medium">
              ({pendingDescription} pending)
            </span>
          )}
        </>
      ) : syncStatus === "pending" ? (
        <>
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Syncing changes...</span>
        </>
      ) : syncStatus === "error" ? (
        <>
          <AlertCircle className="w-4 h-4" />
          <span>Sync error - tap to retry</span>
        </>
      ) : null}
    </div>
  );
};

// Transaction Type Badge
export type TransactionType =
  | "check_in"
  | "check_out"
  | "transfer"
  | "adjustment"
  | "write_off"
  | "return";

export interface TransactionTypeBadgeProps {
  type: TransactionType;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const transactionTypeConfig: Record<
  TransactionType,
  { label: string; colorScheme: "success" | "error" | "info" | "warning" | "neutral" }
> = {
  check_in: { label: "Check In", colorScheme: "success" },
  check_out: { label: "Check Out", colorScheme: "error" },
  transfer: { label: "Transfer", colorScheme: "info" },
  adjustment: { label: "Adjustment", colorScheme: "warning" },
  write_off: { label: "Write Off", colorScheme: "neutral" },
  return: { label: "Return", colorScheme: "success" },
};

export const TransactionTypeBadge: React.FC<TransactionTypeBadgeProps> = ({
  type,
  size = "md",
  className,
}) => {
  const config = transactionTypeConfig[type];

  return (
    <Badge
      colorScheme={config.colorScheme}
      variant="subtle"
      size={size}
      className={className}
    >
      {config.label}
    </Badge>
  );
};

// User Role Badge
export type UserRole = "admin" | "employee";

export interface UserRoleBadgeProps {
  role: UserRole;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const userRoleConfig: Record<
  UserRole,
  { label: string; colorScheme: "primary" | "neutral" }
> = {
  admin: { label: "Admin", colorScheme: "primary" },
  employee: { label: "Employee", colorScheme: "neutral" },
};

export const UserRoleBadge: React.FC<UserRoleBadgeProps> = ({
  role,
  size = "md",
  className,
}) => {
  const config = userRoleConfig[role];

  return (
    <Badge
      colorScheme={config.colorScheme}
      variant="subtle"
      size={size}
      className={className}
    >
      {config.label}
    </Badge>
  );
};

export default OnlineIndicator;
