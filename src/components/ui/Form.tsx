"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { AlertCircle } from "lucide-react";

// Form Context
interface FormControlContextValue {
  id?: string;
  isRequired?: boolean;
  isDisabled?: boolean;
  isInvalid?: boolean;
  isReadOnly?: boolean;
}

const FormControlContext = React.createContext<FormControlContextValue>({});

export const useFormControl = () => React.useContext(FormControlContext);

// FormControl Component
export interface FormControlProps extends React.HTMLAttributes<HTMLDivElement> {
  isRequired?: boolean;
  isDisabled?: boolean;
  isInvalid?: boolean;
  isReadOnly?: boolean;
}

export const FormControl = React.forwardRef<HTMLDivElement, FormControlProps>(
  (
    {
      className,
      isRequired = false,
      isDisabled = false,
      isInvalid = false,
      isReadOnly = false,
      children,
      id,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const controlId = id || generatedId;

    return (
      <FormControlContext.Provider
        value={{
          id: controlId,
          isRequired,
          isDisabled,
          isInvalid,
          isReadOnly,
        }}
      >
        <div
          ref={ref}
          className={cn("space-y-1.5", className)}
          {...props}
        >
          {children}
        </div>
      </FormControlContext.Provider>
    );
  }
);

FormControl.displayName = "FormControl";

// FormLabel Component
export interface FormLabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement> {
  isRequired?: boolean;
  requiredIndicator?: React.ReactNode;
  optionalIndicator?: React.ReactNode;
  size?: "sm" | "md";
}

export const FormLabel = React.forwardRef<HTMLLabelElement, FormLabelProps>(
  (
    {
      className,
      isRequired: isRequiredProp,
      requiredIndicator = <span className="text-error ml-0.5">*</span>,
      optionalIndicator,
      size = "md",
      children,
      ...props
    },
    ref
  ) => {
    const { id, isRequired: isRequiredContext } = useFormControl();
    const isRequired = isRequiredProp ?? isRequiredContext;

    const sizeClasses = {
      sm: "text-xs mb-1",
      md: "text-sm mb-1.5",
    };

    return (
      <label
        ref={ref}
        htmlFor={id}
        className={cn(
          "block font-medium text-foreground",
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {children}
        {isRequired && requiredIndicator}
        {!isRequired && optionalIndicator}
      </label>
    );
  }
);

FormLabel.displayName = "FormLabel";

// FormHelperText Component
export interface FormHelperTextProps
  extends React.HTMLAttributes<HTMLParagraphElement> {}

export const FormHelperText = React.forwardRef<
  HTMLParagraphElement,
  FormHelperTextProps
>(({ className, children, ...props }, ref) => {
  const { isInvalid } = useFormControl();

  if (isInvalid) return null;

  return (
    <p
      ref={ref}
      className={cn("text-xs text-foreground-muted mt-1.5", className)}
      {...props}
    >
      {children}
    </p>
  );
});

FormHelperText.displayName = "FormHelperText";

// FormErrorMessage Component
export interface FormErrorMessageProps
  extends React.HTMLAttributes<HTMLParagraphElement> {
  icon?: React.ReactNode;
}

export const FormErrorMessage = React.forwardRef<
  HTMLParagraphElement,
  FormErrorMessageProps
>(
  (
    {
      className,
      icon = <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />,
      children,
      ...props
    },
    ref
  ) => {
    const { isInvalid } = useFormControl();

    if (!isInvalid) return null;

    return (
      <p
        ref={ref}
        role="alert"
        aria-live="polite"
        className={cn(
          "flex items-center gap-1.5 text-xs text-error mt-1.5",
          className
        )}
        {...props}
      >
        {icon}
        {children}
      </p>
    );
  }
);

FormErrorMessage.displayName = "FormErrorMessage";

// Fieldset Component
export interface FieldsetProps
  extends React.FieldsetHTMLAttributes<HTMLFieldSetElement> {
  legend?: string;
  description?: string;
}

export const Fieldset = React.forwardRef<HTMLFieldSetElement, FieldsetProps>(
  ({ className, legend, description, children, ...props }, ref) => {
    return (
      <fieldset
        ref={ref}
        className={cn("border-0 p-0 m-0 min-w-0", className)}
        {...props}
      >
        {legend && (
          <legend className="block font-semibold text-foreground text-sm mb-2">
            {legend}
          </legend>
        )}
        {description && (
          <p className="text-sm text-foreground-muted mb-4">{description}</p>
        )}
        {children}
      </fieldset>
    );
  }
);

Fieldset.displayName = "Fieldset";

export default FormControl;
