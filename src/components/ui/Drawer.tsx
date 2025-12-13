"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { IconButton } from "./Button";
import type { DrawerPlacement, DrawerSize } from "@/types";

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  placement?: DrawerPlacement;
  size?: DrawerSize;
  closeOnOverlayClick?: boolean;
  closeOnEsc?: boolean;
  children: React.ReactNode;
}

const placementClasses: Record<DrawerPlacement, string> = {
  left: "left-0 top-0 bottom-0",
  right: "right-0 top-0 bottom-0",
  top: "top-0 left-0 right-0",
  bottom: "bottom-0 left-0 right-0",
};

const sizeClasses: Record<DrawerPlacement, Record<DrawerSize, string>> = {
  left: {
    xs: "w-64",
    sm: "w-80",
    md: "w-[400px]",
    lg: "w-[512px]",
    xl: "w-[640px]",
    full: "w-screen",
  },
  right: {
    xs: "w-64",
    sm: "w-80",
    md: "w-[400px]",
    lg: "w-[512px]",
    xl: "w-[640px]",
    full: "w-screen",
  },
  top: {
    xs: "h-48",
    sm: "h-64",
    md: "h-80",
    lg: "h-96",
    xl: "h-[500px]",
    full: "h-screen",
  },
  bottom: {
    xs: "h-48",
    sm: "h-64",
    md: "h-80",
    lg: "h-96",
    xl: "h-[500px]",
    full: "h-screen",
  },
};

const slideAnimations: Record<DrawerPlacement, { enter: string; exit: string }> = {
  left: {
    enter: "translate-x-0",
    exit: "-translate-x-full",
  },
  right: {
    enter: "translate-x-0",
    exit: "translate-x-full",
  },
  top: {
    enter: "translate-y-0",
    exit: "-translate-y-full",
  },
  bottom: {
    enter: "translate-y-0",
    exit: "translate-y-full",
  },
};

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  placement = "right",
  size = "md",
  closeOnOverlayClick = true,
  closeOnEsc = true,
  children,
}) => {
  const overlayRef = React.useRef<HTMLDivElement>(null);
  const drawerRef = React.useRef<HTMLDivElement>(null);
  const [isAnimating, setIsAnimating] = React.useState(false);
  const [shouldRender, setShouldRender] = React.useState(false);

  // Handle animation states
  React.useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      // Small delay to allow DOM update before animation
      requestAnimationFrame(() => {
        setIsAnimating(true);
      });
    } else {
      setIsAnimating(false);
      // Wait for animation to complete before unmounting
      const timeout = setTimeout(() => {
        setShouldRender(false);
      }, 200);
      return () => clearTimeout(timeout);
    }
  }, [isOpen]);

  // Block scroll when drawer is open
  React.useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Handle escape key
  React.useEffect(() => {
    if (!closeOnEsc || !isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeOnEsc, onClose]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (closeOnOverlayClick && e.target === overlayRef.current) {
      onClose();
    }
  };

  if (!shouldRender) return null;

  const animation = slideAnimations[placement];

  const drawerContent = (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className={cn(
        "fixed inset-0 z-modalBackdrop bg-black/50 transition-opacity duration-200",
        isAnimating ? "opacity-100" : "opacity-0"
      )}
      aria-modal="true"
      role="dialog"
    >
      <div
        ref={drawerRef}
        className={cn(
          "fixed bg-white shadow-2xl overflow-hidden flex flex-col transition-transform duration-200",
          placementClasses[placement],
          sizeClasses[placement][size],
          isAnimating ? animation.enter : animation.exit
        )}
      >
        {children}
      </div>
    </div>
  );

  if (typeof window === "undefined") return null;

  return createPortal(drawerContent, document.body);
};

// DrawerHeader Component
export interface DrawerHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  showCloseButton?: boolean;
  onClose?: () => void;
}

export const DrawerHeader = React.forwardRef<HTMLDivElement, DrawerHeaderProps>(
  ({ className, showCloseButton = true, onClose, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center justify-between p-6 border-b border-border flex-shrink-0",
          className
        )}
        {...props}
      >
        <h2 className="font-heading font-semibold text-h4 text-foreground">
          {children}
        </h2>
        {showCloseButton && onClose && (
          <IconButton
            icon={<X className="w-5 h-5" />}
            aria-label="Close drawer"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="-mr-2"
          />
        )}
      </div>
    );
  }
);

DrawerHeader.displayName = "DrawerHeader";

// DrawerBody Component
export interface DrawerBodyProps extends React.HTMLAttributes<HTMLDivElement> {}

export const DrawerBody = React.forwardRef<HTMLDivElement, DrawerBodyProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("p-6 overflow-y-auto flex-1", className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

DrawerBody.displayName = "DrawerBody";

// DrawerFooter Component
export interface DrawerFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

export const DrawerFooter = React.forwardRef<HTMLDivElement, DrawerFooterProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center justify-end gap-3 p-6 border-t border-border flex-shrink-0",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

DrawerFooter.displayName = "DrawerFooter";

export default Drawer;
