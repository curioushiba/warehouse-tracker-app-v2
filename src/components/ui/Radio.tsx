"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { Size } from "@/types";

export interface RadioProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size" | "type"> {
  size?: Size;
  isInvalid?: boolean;
  colorScheme?: "primary" | "success" | "warning" | "error";
  label?: React.ReactNode;
  helperText?: string;
}

const sizeClasses: Record<Size, { control: string; dot: string; label: string }> = {
  xs: { control: "w-3.5 h-3.5", dot: "w-1.5 h-1.5", label: "text-xs" },
  sm: { control: "w-4 h-4", dot: "w-1.5 h-1.5", label: "text-sm" },
  md: { control: "w-5 h-5", dot: "w-2 h-2", label: "text-sm" },
  lg: { control: "w-6 h-6", dot: "w-2.5 h-2.5", label: "text-base" },
  xl: { control: "w-7 h-7", dot: "w-3 h-3", label: "text-base" },
  "2xl": { control: "w-8 h-8", dot: "w-3.5 h-3.5", label: "text-lg" },
};

const colorSchemeClasses = {
  primary: "border-primary",
  success: "border-success",
  warning: "border-warning",
  error: "border-error",
};

const dotColorClasses = {
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  error: "bg-error",
};

export const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
  (
    {
      className,
      size = "md",
      isInvalid = false,
      colorScheme = "primary",
      label,
      helperText,
      disabled,
      checked,
      ...props
    },
    ref
  ) => {
    const sizes = sizeClasses[size];

    return (
      <label
        className={cn(
          "inline-flex items-start gap-2 cursor-pointer",
          disabled && "cursor-not-allowed opacity-60",
          className
        )}
      >
        {/* Hidden radio input */}
        <input
          ref={ref}
          type="radio"
          className="sr-only"
          disabled={disabled}
          checked={checked}
          {...props}
        />

        {/* Custom radio control */}
        <span
          className={cn(
            "flex-shrink-0 rounded-full border-2 transition-colors duration-150",
            "flex items-center justify-center",
            sizes.control,
            checked ? colorSchemeClasses[colorScheme] : "border-border",
            !disabled && "hover:border-primary",
            isInvalid && "border-error"
          )}
          aria-hidden="true"
        >
          <span
            className={cn(
              "rounded-full transition-transform duration-150",
              sizes.dot,
              checked
                ? cn(dotColorClasses[colorScheme], "scale-100")
                : "scale-0 bg-transparent"
            )}
          />
        </span>

        {/* Label */}
        {(label || helperText) && (
          <div className="flex flex-col">
            {label && (
              <span
                className={cn(
                  "text-foreground select-none",
                  sizes.label,
                  disabled && "text-foreground-disabled"
                )}
              >
                {label}
              </span>
            )}
            {helperText && (
              <span className="text-xs text-foreground-muted mt-0.5">
                {helperText}
              </span>
            )}
          </div>
        )}
      </label>
    );
  }
);

Radio.displayName = "Radio";

// RadioGroup Component
export interface RadioGroupProps {
  name: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  children: React.ReactNode;
  orientation?: "horizontal" | "vertical";
  spacing?: Size;
  className?: string;
}

export const RadioGroup: React.FC<RadioGroupProps> = ({
  name,
  value,
  defaultValue = "",
  onChange,
  children,
  orientation = "vertical",
  spacing = "sm",
  className,
}) => {
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const currentValue = value !== undefined ? value : internalValue;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (value === undefined) {
      setInternalValue(newValue);
    }
    onChange?.(newValue);
  };

  const spacingClasses: Record<Size, string> = {
    xs: "gap-1",
    sm: "gap-2",
    md: "gap-3",
    lg: "gap-4",
    xl: "gap-5",
    "2xl": "gap-6",
  };

  return (
    <div
      role="radiogroup"
      className={cn(
        "flex",
        orientation === "vertical" ? "flex-col" : "flex-row flex-wrap",
        spacingClasses[spacing],
        className
      )}
    >
      {React.Children.map(children, (child) => {
        if (React.isValidElement<RadioProps>(child)) {
          return React.cloneElement(child, {
            name,
            checked: child.props.value === currentValue,
            onChange: handleChange,
          });
        }
        return child;
      })}
    </div>
  );
};

export default Radio;
