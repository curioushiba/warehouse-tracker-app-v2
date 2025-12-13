"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { CardVariant, Size } from "@/types";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  size?: Size;
  isClickable?: boolean;
  isHoverable?: boolean;
  direction?: "vertical" | "horizontal";
}

const variantClasses: Record<CardVariant, string> = {
  elevated: "bg-white shadow-md",
  outline: "bg-white border border-border",
  filled: "bg-secondary",
  spotlight: "bg-white shadow-lg rounded-xl",
  unstyled: "bg-transparent",
};

const sizeClasses: Record<Size, string> = {
  xs: "p-2",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
  xl: "p-10",
  "2xl": "p-12",
};

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      variant = "elevated",
      size = "md",
      isClickable = false,
      isHoverable = false,
      direction = "vertical",
      children,
      onClick,
      ...props
    },
    ref
  ) => {
    const interactive = isClickable || isHoverable;

    return (
      <div
        ref={ref}
        role={isClickable ? "button" : undefined}
        tabIndex={isClickable ? 0 : undefined}
        onClick={onClick}
        onKeyDown={
          isClickable
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onClick?.(e as unknown as React.MouseEvent<HTMLDivElement>);
                }
              }
            : undefined
        }
        className={cn(
          "rounded-card overflow-hidden transition-all duration-200",
          variantClasses[variant],
          variant !== "unstyled" && sizeClasses[size],
          direction === "horizontal" && "flex flex-row",
          interactive && "cursor-pointer",
          (isHoverable || isClickable) &&
            "hover:-translate-y-1 hover:shadow-xl",
          isClickable &&
            "focus:outline-none focus:ring-[3px] focus:ring-primary/30",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

// CardHeader Component
export interface CardHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactElement;
  hasBorder?: boolean;
}

export const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, title, subtitle, action, hasBorder = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex items-start justify-between",
          hasBorder && "pb-4 border-b border-border",
          className
        )}
        {...props}
      >
        {(title || subtitle) && (
          <div className="flex-1">
            {title && (
              <h3 className="font-heading font-semibold text-lg text-foreground">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-sm text-foreground-muted mt-0.5">{subtitle}</p>
            )}
          </div>
        )}
        {action && <div className="ml-4 flex-shrink-0">{action}</div>}
        {children}
      </div>
    );
  }
);

CardHeader.displayName = "CardHeader";

// CardBody Component
export interface CardBodyProps extends React.HTMLAttributes<HTMLDivElement> {}

export const CardBody = React.forwardRef<HTMLDivElement, CardBodyProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("py-4", className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardBody.displayName = "CardBody";

// CardFooter Component
export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  hasBorder?: boolean;
  justify?: "start" | "center" | "end" | "between";
}

export const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, hasBorder = false, justify = "end", children, ...props }, ref) => {
    const justifyClasses = {
      start: "justify-start",
      center: "justify-center",
      end: "justify-end",
      between: "justify-between",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center gap-2",
          justifyClasses[justify],
          hasBorder && "pt-4 border-t border-border",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardFooter.displayName = "CardFooter";

// CardImage Component
export interface CardImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  aspectRatio?: "square" | "spotlight" | "landscape" | "widescreen";
  overlay?: React.ReactNode;
}

export const CardImage = React.forwardRef<HTMLImageElement, CardImageProps>(
  ({ className, aspectRatio = "widescreen", overlay, alt = "", ...props }, ref) => {
    const aspectClasses = {
      square: "aspect-square",
      spotlight: "aspect-[3/2]",
      landscape: "aspect-[4/3]",
      widescreen: "aspect-video",
    };

    return (
      <div className={cn("relative overflow-hidden -m-6 mb-4", aspectClasses[aspectRatio])}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={ref}
          alt={alt}
          className={cn("w-full h-full object-cover", className)}
          {...props}
        />
        {overlay && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
            {overlay}
          </div>
        )}
      </div>
    );
  }
);

CardImage.displayName = "CardImage";

export default Card;
