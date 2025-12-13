"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import {
  Info,
  CheckCircle,
  AlertTriangle,
  XCircle,
  X,
} from "lucide-react";
import type { ToastStatus, ToastPosition } from "@/types";

// Toast Context for managing toasts globally
interface ToastData {
  id: string;
  title?: string;
  description?: string;
  status: ToastStatus;
  duration?: number | null;
  isClosable?: boolean;
  position: ToastPosition;
}

interface ToastContextValue {
  toasts: ToastData[];
  addToast: (toast: Omit<ToastData, "id">) => string;
  removeToast: (id: string) => void;
  removeAllToasts: () => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export const useToast = () => {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

// Toast Provider
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = React.useState<ToastData[]>([]);

  const addToast = React.useCallback((toast: Omit<ToastData, "id">) => {
    const id = Math.random().toString(36).slice(2);
    const newToast: ToastData = {
      ...toast,
      id,
      duration: toast.duration !== null ? toast.duration ?? 5000 : null,
      isClosable: toast.isClosable ?? true,
      position: toast.position ?? "bottom-right",
    };

    setToasts((prev) => [...prev, newToast]);

    if (newToast.duration) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, newToast.duration);
    }

    return id;
  }, []);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const removeAllToasts = React.useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider
      value={{ toasts, addToast, removeToast, removeAllToasts }}
    >
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
};

// Toast Container - renders all active toasts
const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  // Group toasts by position
  const groupedToasts = React.useMemo(() => {
    const groups: Record<ToastPosition, ToastData[]> = {
      top: [],
      "top-left": [],
      "top-right": [],
      bottom: [],
      "bottom-left": [],
      "bottom-right": [],
    };

    toasts.forEach((toast) => {
      groups[toast.position].push(toast);
    });

    return groups;
  }, [toasts]);

  if (typeof window === "undefined") return null;

  const positionClasses: Record<ToastPosition, string> = {
    top: "top-0 left-1/2 -translate-x-1/2",
    "top-left": "top-0 left-0",
    "top-right": "top-0 right-0",
    bottom: "bottom-0 left-1/2 -translate-x-1/2",
    "bottom-left": "bottom-0 left-0",
    "bottom-right": "bottom-0 right-0",
  };

  return createPortal(
    <>
      {(Object.keys(groupedToasts) as ToastPosition[]).map((position) => {
        const positionToasts = groupedToasts[position];
        if (positionToasts.length === 0) return null;

        return (
          <div
            key={position}
            className={cn(
              "fixed z-toast pointer-events-none flex flex-col gap-2 p-4",
              positionClasses[position],
              position.startsWith("bottom") ? "flex-col-reverse" : "flex-col"
            )}
          >
            {positionToasts.map((toast) => (
              <ToastItem
                key={toast.id}
                {...toast}
                onClose={() => removeToast(toast.id)}
              />
            ))}
          </div>
        );
      })}
    </>,
    document.body
  );
};

// Single Toast Item
interface ToastItemProps extends ToastData {
  onClose: () => void;
}

const statusConfig: Record<
  ToastStatus,
  { icon: React.ReactNode; className: string }
> = {
  info: {
    icon: <Info className="w-5 h-5" />,
    className: "bg-info text-white",
  },
  success: {
    icon: <CheckCircle className="w-5 h-5" />,
    className: "bg-success text-white",
  },
  warning: {
    icon: <AlertTriangle className="w-5 h-5" />,
    className: "bg-warning text-foreground",
  },
  error: {
    icon: <XCircle className="w-5 h-5" />,
    className: "bg-error text-white",
  },
};

const ToastItem: React.FC<ToastItemProps> = ({
  title,
  description,
  status,
  isClosable,
  onClose,
}) => {
  const config = statusConfig[status];

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={cn(
        "pointer-events-auto flex items-start gap-3 p-4 rounded-lg shadow-lg",
        "min-w-[300px] max-w-md animate-slide-in-up",
        config.className
      )}
    >
      <span className="flex-shrink-0 mt-0.5" aria-hidden="true">
        {config.icon}
      </span>

      <div className="flex-1 min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        {description && (
          <p className={cn("text-sm", title && "mt-1")}>{description}</p>
        )}
      </div>

      {isClosable && (
        <button
          type="button"
          onClick={onClose}
          className={cn(
            "flex-shrink-0 p-1 -mr-1 -mt-1 rounded transition-colors",
            status === "warning" ? "hover:bg-black/10" : "hover:bg-white/20"
          )}
          aria-label="Close notification"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

// Convenience hook for creating toasts
export const useToastHelpers = () => {
  const { addToast, removeToast, removeAllToasts } = useToast();

  return {
    toast: addToast,
    success: (title: string, description?: string) =>
      addToast({ status: "success", title, description, position: "bottom-right" }),
    error: (title: string, description?: string) =>
      addToast({ status: "error", title, description, position: "bottom-right" }),
    warning: (title: string, description?: string) =>
      addToast({ status: "warning", title, description, position: "bottom-right" }),
    info: (title: string, description?: string) =>
      addToast({ status: "info", title, description, position: "bottom-right" }),
    dismiss: removeToast,
    dismissAll: removeAllToasts,
  };
};

export default ToastProvider;
