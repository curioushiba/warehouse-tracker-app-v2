"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { IconButton } from "./Button";
import type { ModalSize } from "@/types";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  size?: ModalSize;
  isCentered?: boolean;
  scrollBehavior?: "inside" | "outside";
  closeOnOverlayClick?: boolean;
  closeOnEsc?: boolean;
  blockScrollOnMount?: boolean;
  trapFocus?: boolean;
  children: React.ReactNode;
  initialFocusRef?: React.RefObject<HTMLElement>;
}

const sizeClasses: Record<ModalSize, string> = {
  sm: "max-w-[400px]",
  md: "max-w-[500px]",
  lg: "max-w-[700px]",
  xl: "max-w-[900px]",
  full: "max-w-full h-full m-0 rounded-none",
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  size = "md",
  isCentered = true,
  scrollBehavior = "inside",
  closeOnOverlayClick = true,
  closeOnEsc = true,
  blockScrollOnMount = true,
  trapFocus = true,
  children,
  initialFocusRef,
}) => {
  const overlayRef = React.useRef<HTMLDivElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const previousActiveElement = React.useRef<HTMLElement | null>(null);

  // Block scroll when modal is open
  React.useEffect(() => {
    if (blockScrollOnMount && isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen, blockScrollOnMount]);

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

  // Focus management
  React.useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;

      if (initialFocusRef?.current) {
        initialFocusRef.current.focus();
      } else if (containerRef.current) {
        const focusableElements = containerRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length > 0) {
          (focusableElements[0] as HTMLElement).focus();
        }
      }
    } else if (previousActiveElement.current) {
      previousActiveElement.current.focus();
    }
  }, [isOpen, initialFocusRef]);

  // Focus trap
  React.useEffect(() => {
    if (!trapFocus || !isOpen || !containerRef.current) return;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !containerRef.current) return;

      const focusableElements = containerRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener("keydown", handleTabKey);
    return () => document.removeEventListener("keydown", handleTabKey);
  }, [isOpen, trapFocus]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (closeOnOverlayClick && e.target === overlayRef.current) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className={cn(
        "fixed inset-0 z-modalBackdrop bg-black/50 backdrop-blur-sm",
        "flex p-4 animate-fade-in",
        isCentered ? "items-center justify-center" : "items-start justify-center pt-16",
        scrollBehavior === "outside" && "overflow-y-auto"
      )}
      aria-modal="true"
      role="dialog"
    >
      <div
        ref={containerRef}
        className={cn(
          "relative bg-white rounded-modal shadow-2xl w-full animate-scale-in",
          sizeClasses[size],
          scrollBehavior === "inside" && "max-h-[90vh] overflow-hidden flex flex-col"
        )}
      >
        {children}
      </div>
    </div>
  );

  if (typeof window === "undefined") return null;

  return createPortal(modalContent, document.body);
};

// ModalHeader Component
export interface ModalHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  showCloseButton?: boolean;
  onClose?: () => void;
}

export const ModalHeader = React.forwardRef<HTMLDivElement, ModalHeaderProps>(
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
            aria-label="Close modal"
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

ModalHeader.displayName = "ModalHeader";

// ModalBody Component
export interface ModalBodyProps extends React.HTMLAttributes<HTMLDivElement> {}

export const ModalBody = React.forwardRef<HTMLDivElement, ModalBodyProps>(
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

ModalBody.displayName = "ModalBody";

// ModalFooter Component
export interface ModalFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

export const ModalFooter = React.forwardRef<HTMLDivElement, ModalFooterProps>(
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

ModalFooter.displayName = "ModalFooter";

export default Modal;
