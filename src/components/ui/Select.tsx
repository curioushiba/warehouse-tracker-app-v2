"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, Check, X } from "lucide-react";
import type { InputVariant, Size } from "@/types";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  variant?: InputVariant;
  size?: Size;
  isDisabled?: boolean;
  isInvalid?: boolean;
  isRequired?: boolean;
  isClearable?: boolean;
  onChange?: (value: string) => void;
  className?: string;
  name?: string;
  id?: string;
  "aria-label"?: string;
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

export const Select = React.forwardRef<HTMLDivElement, SelectProps>(
  (
    {
      options,
      value,
      defaultValue,
      placeholder = "Select an option",
      variant = "outline",
      size = "md",
      isDisabled = false,
      isInvalid = false,
      isRequired = false,
      isClearable = false,
      onChange,
      className,
      name,
      id,
      "aria-label": ariaLabel,
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [internalValue, setInternalValue] = React.useState(defaultValue || "");
    const containerRef = React.useRef<HTMLDivElement>(null);
    const listboxRef = React.useRef<HTMLUListElement>(null);
    const [focusedIndex, setFocusedIndex] = React.useState(-1);

    const currentValue = value !== undefined ? value : internalValue;
    const selectedOption = options.find((opt) => opt.value === currentValue);

    // Close on outside click
    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          containerRef.current &&
          !containerRef.current.contains(event.target as Node)
        ) {
          setIsOpen(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (optionValue: string) => {
      if (value === undefined) {
        setInternalValue(optionValue);
      }
      onChange?.(optionValue);
      setIsOpen(false);
    };

    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (value === undefined) {
        setInternalValue("");
      }
      onChange?.("");
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (isDisabled) return;

      switch (e.key) {
        case "Enter":
        case " ":
          e.preventDefault();
          if (isOpen && focusedIndex >= 0) {
            const option = options[focusedIndex];
            if (!option.disabled) {
              handleSelect(option.value);
            }
          } else {
            setIsOpen(!isOpen);
          }
          break;
        case "ArrowDown":
          e.preventDefault();
          if (!isOpen) {
            setIsOpen(true);
          } else {
            setFocusedIndex((prev) =>
              prev < options.length - 1 ? prev + 1 : 0
            );
          }
          break;
        case "ArrowUp":
          e.preventDefault();
          if (!isOpen) {
            setIsOpen(true);
          } else {
            setFocusedIndex((prev) =>
              prev > 0 ? prev - 1 : options.length - 1
            );
          }
          break;
        case "Escape":
          e.preventDefault();
          setIsOpen(false);
          break;
        case "Home":
          e.preventDefault();
          setFocusedIndex(0);
          break;
        case "End":
          e.preventDefault();
          setFocusedIndex(options.length - 1);
          break;
      }
    };

    return (
      <div ref={ref} className={cn("relative w-full", className)}>
        {/* Hidden native select for form submission */}
        <select
          name={name}
          value={currentValue}
          onChange={() => {}}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        >
          <option value="">{placeholder}</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Custom Select Trigger */}
        <div
          ref={containerRef}
          id={id}
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-required={isRequired}
          aria-invalid={isInvalid}
          aria-label={ariaLabel}
          aria-controls={`${id}-listbox`}
          tabIndex={isDisabled ? -1 : 0}
          onClick={() => !isDisabled && setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          className={cn(
            // Base styles
            "w-full flex items-center justify-between font-body text-foreground transition-colors duration-150 cursor-pointer focus:outline-none",
            // Variant styles
            variantClasses[variant],
            // Size styles
            sizeClasses[size],
            // State styles
            isInvalid && "border-error focus:ring-error/20",
            isDisabled && "bg-neutral-100 text-foreground-disabled cursor-not-allowed opacity-100",
            isOpen && "border-primary ring-2 ring-primary/20"
          )}
        >
          <span
            className={cn(
              "truncate",
              !selectedOption && "text-foreground-placeholder"
            )}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <div className="flex items-center gap-1">
            {isClearable && currentValue && !isDisabled && (
              <button
                type="button"
                onClick={handleClear}
                className="p-0.5 hover:bg-neutral-100 rounded-full"
                tabIndex={-1}
              >
                <X className="w-4 h-4 text-foreground-muted" />
              </button>
            )}
            <ChevronDown
              className={cn(
                "w-4 h-4 text-foreground-muted transition-transform duration-200",
                isOpen && "rotate-180"
              )}
            />
          </div>
        </div>

        {/* Dropdown Listbox */}
        {isOpen && (
          <ul
            ref={listboxRef}
            id={`${id}-listbox`}
            role="listbox"
            className="absolute z-dropdown mt-1 w-full bg-white border border-border rounded-lg shadow-lg max-h-60 overflow-auto animate-fade-in"
          >
            {options.length === 0 ? (
              <li className="px-3 py-2 text-sm text-foreground-muted">
                No options available
              </li>
            ) : (
              options.map((option, index) => (
                <li
                  key={option.value}
                  role="option"
                  aria-selected={option.value === currentValue}
                  aria-disabled={option.disabled}
                  onClick={() => !option.disabled && handleSelect(option.value)}
                  className={cn(
                    "px-3 py-2 text-sm cursor-pointer flex items-center justify-between",
                    "hover:bg-primary-50 focus:bg-primary-50",
                    option.value === currentValue &&
                      "bg-primary-50 text-primary font-medium",
                    option.disabled &&
                      "opacity-50 cursor-not-allowed hover:bg-transparent",
                    focusedIndex === index && "bg-primary-50"
                  )}
                >
                  {option.label}
                  {option.value === currentValue && (
                    <Check className="w-4 h-4 text-primary" />
                  )}
                </li>
              ))
            )}
          </ul>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";

export default Select;
