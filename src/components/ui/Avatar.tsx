"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { User } from "lucide-react";
import type { Size } from "@/types";

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  name?: string;
  size?: Size;
  showStatus?: boolean;
  status?: "online" | "offline" | "away" | "busy";
}

const sizeClasses: Record<Size, string> = {
  xs: "w-6 h-6 text-[10px]",
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
  xl: "w-14 h-14 text-lg",
  "2xl": "w-16 h-16 text-xl",
};

const statusSizeClasses: Record<Size, string> = {
  xs: "w-1.5 h-1.5",
  sm: "w-2 h-2",
  md: "w-2.5 h-2.5",
  lg: "w-3 h-3",
  xl: "w-3.5 h-3.5",
  "2xl": "w-4 h-4",
};

const statusColorClasses = {
  online: "bg-success",
  offline: "bg-neutral-400",
  away: "bg-warning",
  busy: "bg-error",
};

function getInitials(name: string): string {
  const parts = name.trim().split(" ");
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  (
    {
      className,
      src,
      alt = "",
      name,
      size = "md",
      showStatus = false,
      status = "offline",
      ...props
    },
    ref
  ) => {
    const [imgError, setImgError] = React.useState(false);

    const showImage = src && !imgError;
    const initials = name ? getInitials(name) : null;

    return (
      <div
        ref={ref}
        className={cn(
          "relative inline-flex items-center justify-center rounded-full overflow-hidden flex-shrink-0",
          "bg-primary-100 text-primary font-medium",
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={alt || name || "Avatar"}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : initials ? (
          <span>{initials}</span>
        ) : (
          <User className="w-1/2 h-1/2" />
        )}

        {showStatus && (
          <span
            className={cn(
              "absolute bottom-0 right-0 rounded-full border-2 border-white",
              statusSizeClasses[size],
              statusColorClasses[status]
            )}
          />
        )}
      </div>
    );
  }
);

Avatar.displayName = "Avatar";

// Avatar Group Component
export interface AvatarGroupProps {
  children: React.ReactNode;
  max?: number;
  size?: Size;
  spacing?: "tight" | "normal" | "loose";
  className?: string;
}

export const AvatarGroup: React.FC<AvatarGroupProps> = ({
  children,
  max,
  size = "md",
  spacing = "tight",
  className,
}) => {
  const childArray = React.Children.toArray(children);
  const displayChildren = max ? childArray.slice(0, max) : childArray;
  const remaining = max ? childArray.length - max : 0;

  const spacingClasses = {
    tight: "-space-x-2",
    normal: "-space-x-1",
    loose: "space-x-1",
  };

  return (
    <div className={cn("flex items-center", spacingClasses[spacing], className)}>
      {displayChildren.map((child, index) => (
        <div key={index} className="relative ring-2 ring-white rounded-full">
          {React.isValidElement<AvatarProps>(child)
            ? React.cloneElement(child, { size })
            : child}
        </div>
      ))}
      {remaining > 0 && (
        <div
          className={cn(
            "relative ring-2 ring-white rounded-full flex items-center justify-center",
            "bg-neutral-200 text-foreground-muted font-medium",
            sizeClasses[size]
          )}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
};

export default Avatar;
