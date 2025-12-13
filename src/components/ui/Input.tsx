"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { X, Eye, EyeOff, Search } from "lucide-react";
import type { InputVariant, Size } from "@/types";

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  variant?: InputVariant;
  size?: Size;
  isInvalid?: boolean;
  isReadOnly?: boolean;
  isClearable?: boolean;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
  onClear?: () => void;
}

const variantClasses: Record<InputVariant, string> = {
  outline:
    "bg-white border border-border rounded-input hover:border-primary focus:border-primary focus:ring-2 focus:ring-primary/20",
  filled:
    "bg-background-tertiary border-2 border-transparent rounded-input hover:bg-background-sunken focus:bg-white focus:border-primary",
  flushed:
    "bg-transparent border-0 border-b border-border rounded-none px-0 focus:border-b-2 focus:border-primary",
};

const sizeClasses: Record<Size, string> = {
  xs: "h-7 px-2 text-xs",
  sm: "h-8 px-3 text-[13px]",
  md: "h-10 px-3 text-sm",
  lg: "h-12 px-4 text-base",
  xl: "h-14 px-5 text-lg",
  "2xl": "h-16 px-6 text-xl",
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = "text",
      variant = "outline",
      size = "md",
      isInvalid = false,
      isReadOnly = false,
      isClearable = false,
      leftElement,
      rightElement,
      onClear,
      disabled,
      value,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const isPasswordType = type === "password";
    const actualType = isPasswordType && showPassword ? "text" : type;

    const hasValue = value !== undefined && value !== "";
    const showClearButton = isClearable && hasValue && !disabled && !isReadOnly;
    const showPasswordToggle = isPasswordType && !disabled && !isReadOnly;

    return (
      <div className="relative w-full">
        {/* Left Element */}
        {leftElement && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted pointer-events-none">
            {leftElement}
          </div>
        )}

        <input
          ref={ref}
          type={actualType}
          className={cn(
            // Base styles
            "w-full font-body text-foreground transition-colors duration-150 focus:outline-none",
            "placeholder:text-foreground-placeholder",
            // Variant styles
            variantClasses[variant],
            // Size styles
            sizeClasses[size],
            // Padding adjustments for elements
            leftElement && "pl-10",
            (rightElement || showClearButton || showPasswordToggle) && "pr-10",
            // State styles
            isInvalid && "border-error focus:ring-error/20",
            isReadOnly && "bg-neutral-50 cursor-default",
            disabled && "bg-neutral-100 text-foreground-disabled cursor-not-allowed opacity-100",
            className
          )}
          disabled={disabled}
          readOnly={isReadOnly}
          value={value}
          aria-invalid={isInvalid}
          {...props}
        />

        {/* Right side elements container */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {/* Clear Button */}
          {showClearButton && (
            <button
              type="button"
              onClick={onClear}
              className="p-1 text-foreground-muted hover:text-foreground transition-colors rounded-full hover:bg-neutral-100"
              tabIndex={-1}
              aria-label="Clear input"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Password Toggle */}
          {showPasswordToggle && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="p-1 text-foreground-muted hover:text-foreground transition-colors rounded-full hover:bg-neutral-100"
              tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          )}

          {/* Custom Right Element */}
          {rightElement && !showClearButton && !showPasswordToggle && (
            <div className="text-foreground-muted">{rightElement}</div>
          )}
        </div>
      </div>
    );
  }
);

Input.displayName = "Input";

// Search Input Variant
export interface SearchInputProps extends Omit<InputProps, "leftElement" | "type"> {
  onSearch?: (value: string) => void;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, onSearch, onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e);
      onSearch?.(e.target.value);
    };

    return (
      <Input
        ref={ref}
        type="search"
        leftElement={<Search className="w-4 h-4" />}
        isClearable
        onChange={handleChange}
        className={className}
        {...props}
      />
    );
  }
);

SearchInput.displayName = "SearchInput";

export default Input;
