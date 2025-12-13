"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Check, Minus } from "lucide-react";
import type { Size } from "@/types";

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size" | "type"> {
  size?: Size;
  isChecked?: boolean;
  isIndeterminate?: boolean;
  isInvalid?: boolean;
  colorScheme?: "primary" | "success" | "warning" | "error";
  label?: React.ReactNode;
  helperText?: string;
}

const sizeClasses: Record<Size, { control: string; icon: string; label: string }> = {
  xs: { control: "w-3.5 h-3.5", icon: "w-2.5 h-2.5", label: "text-xs" },
  sm: { control: "w-4 h-4", icon: "w-2.5 h-2.5", label: "text-sm" },
  md: { control: "w-5 h-5", icon: "w-3 h-3", label: "text-sm" },
  lg: { control: "w-6 h-6", icon: "w-3.5 h-3.5", label: "text-base" },
  xl: { control: "w-7 h-7", icon: "w-4 h-4", label: "text-base" },
  "2xl": { control: "w-8 h-8", icon: "w-5 h-5", label: "text-lg" },
};

const colorSchemeClasses = {
  primary: "bg-primary border-primary",
  success: "bg-success border-success",
  warning: "bg-warning border-warning",
  error: "bg-error border-error",
};

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      className,
      size = "md",
      isChecked,
      isIndeterminate = false,
      isInvalid = false,
      colorScheme = "primary",
      label,
      helperText,
      disabled,
      defaultChecked,
      onChange,
      ...props
    },
    ref
  ) => {
    const [internalChecked, setInternalChecked] = React.useState(
      defaultChecked || false
    );
    const checked = isChecked !== undefined ? isChecked : internalChecked;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (isChecked === undefined) {
        setInternalChecked(e.target.checked);
      }
      onChange?.(e);
    };

    const sizes = sizeClasses[size];

    return (
      <label
        className={cn(
          "inline-flex items-start gap-2 cursor-pointer",
          disabled && "cursor-not-allowed opacity-60",
          className
        )}
      >
        {/* Hidden checkbox input */}
        <input
          ref={ref}
          type="checkbox"
          className="sr-only"
          checked={checked}
          disabled={disabled}
          onChange={handleChange}
          aria-invalid={isInvalid}
          {...props}
        />

        {/* Custom checkbox control */}
        <span
          className={cn(
            "flex-shrink-0 rounded border-2 transition-colors duration-150",
            "flex items-center justify-center",
            sizes.control,
            checked || isIndeterminate
              ? cn(colorSchemeClasses[colorScheme], "text-white")
              : "bg-white border-border",
            !disabled && "hover:border-primary",
            isInvalid && "border-error"
          )}
          aria-hidden="true"
        >
          {isIndeterminate ? (
            <Minus className={sizes.icon} strokeWidth={3} />
          ) : checked ? (
            <Check className={sizes.icon} strokeWidth={3} />
          ) : null}
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

Checkbox.displayName = "Checkbox";

// CheckboxGroup Component
export interface CheckboxGroupProps {
  value?: string[];
  defaultValue?: string[];
  onChange?: (values: string[]) => void;
  children: React.ReactNode;
  orientation?: "horizontal" | "vertical";
  spacing?: Size;
  className?: string;
}

export const CheckboxGroup: React.FC<CheckboxGroupProps> = ({
  value,
  defaultValue = [],
  onChange,
  children,
  orientation = "vertical",
  spacing = "sm",
  className,
}) => {
  const [internalValues, setInternalValues] = React.useState<string[]>(defaultValue);
  const values = value !== undefined ? value : internalValues;

  const handleChange = (checkboxValue: string, checked: boolean) => {
    const newValues = checked
      ? [...values, checkboxValue]
      : values.filter((v) => v !== checkboxValue);

    if (value === undefined) {
      setInternalValues(newValues);
    }
    onChange?.(newValues);
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
      role="group"
      className={cn(
        "flex",
        orientation === "vertical" ? "flex-col" : "flex-row flex-wrap",
        spacingClasses[spacing],
        className
      )}
    >
      {React.Children.map(children, (child) => {
        if (React.isValidElement<CheckboxProps>(child)) {
          const checkboxValue = child.props.value as string;
          return React.cloneElement(child, {
            isChecked: values.includes(checkboxValue),
            onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
              handleChange(checkboxValue, e.target.checked);
              child.props.onChange?.(e);
            },
          });
        }
        return child;
      })}
    </div>
  );
};

export default Checkbox;
