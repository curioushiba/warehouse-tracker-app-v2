"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { TabVariant, Size } from "@/types";

// Tabs Context
interface TabsContextValue {
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  variant: TabVariant;
  size: Size;
  orientation: "horizontal" | "vertical";
  isFitted: boolean;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

const useTabs = () => {
  const context = React.useContext(TabsContext);
  if (!context) {
    throw new Error("Tabs components must be used within a Tabs provider");
  }
  return context;
};

// Tabs Component
export interface TabsProps {
  index?: number;
  defaultIndex?: number;
  onChange?: (index: number) => void;
  variant?: TabVariant;
  size?: Size;
  orientation?: "horizontal" | "vertical";
  isFitted?: boolean;
  isLazy?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  index,
  defaultIndex = 0,
  onChange,
  variant = "line",
  size = "md",
  orientation = "horizontal",
  isFitted = false,
  isLazy = false,
  children,
  className,
}) => {
  const [internalIndex, setInternalIndex] = React.useState(defaultIndex);
  const activeIndex = index !== undefined ? index : internalIndex;

  const setActiveIndex = React.useCallback(
    (newIndex: number) => {
      if (index === undefined) {
        setInternalIndex(newIndex);
      }
      onChange?.(newIndex);
    },
    [index, onChange]
  );

  return (
    <TabsContext.Provider
      value={{ activeIndex, setActiveIndex, variant, size, orientation, isFitted }}
    >
      <div
        className={cn(
          orientation === "vertical" && "flex",
          className
        )}
      >
        {children}
      </div>
    </TabsContext.Provider>
  );
};

// TabList Component
export interface TabListProps extends React.HTMLAttributes<HTMLDivElement> {}

export const TabList = React.forwardRef<HTMLDivElement, TabListProps>(
  ({ className, children, ...props }, ref) => {
    const { variant, orientation, isFitted } = useTabs();

    const variantClasses: Record<TabVariant, string> = {
      line: orientation === "horizontal"
        ? "border-b border-border"
        : "border-r border-border",
      enclosed: "bg-neutral-100 rounded-lg p-1",
      "soft-rounded": "gap-1",
      "solid-rounded": "gap-1",
    };

    return (
      <div
        ref={ref}
        role="tablist"
        aria-orientation={orientation}
        className={cn(
          "flex",
          orientation === "horizontal" ? "flex-row" : "flex-col",
          isFitted && "w-full",
          variantClasses[variant],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

TabList.displayName = "TabList";

// Tab Component
export interface TabProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  index?: number;
  isDisabled?: boolean;
}

export const Tab = React.forwardRef<HTMLButtonElement, TabProps>(
  ({ className, index = 0, isDisabled = false, children, ...props }, ref) => {
    const { activeIndex, setActiveIndex, variant, size, isFitted } = useTabs();
    const isActive = activeIndex === index;

    const sizeClasses: Record<Size, string> = {
      xs: "px-2 py-1 text-xs",
      sm: "px-3 py-1.5 text-sm",
      md: "px-4 py-2.5 text-sm",
      lg: "px-5 py-3 text-base",
      xl: "px-6 py-3.5 text-base",
      "2xl": "px-8 py-4 text-lg",
    };

    const variantClasses: Record<TabVariant, { base: string; active: string }> = {
      line: {
        base: "relative text-foreground-muted hover:text-foreground transition-colors border-b-2 border-transparent -mb-px",
        active: "text-primary border-b-primary",
      },
      enclosed: {
        base: "rounded-md text-foreground-muted hover:text-foreground transition-all",
        active: "bg-white text-foreground shadow-sm",
      },
      "soft-rounded": {
        base: "rounded-full text-foreground-muted hover:text-foreground hover:bg-primary-50 transition-all",
        active: "bg-primary-50 text-primary",
      },
      "solid-rounded": {
        base: "rounded-full text-foreground-muted hover:text-foreground transition-all",
        active: "bg-primary text-white",
      },
    };

    const styles = variantClasses[variant];

    return (
      <button
        ref={ref}
        role="tab"
        type="button"
        aria-selected={isActive}
        aria-disabled={isDisabled}
        tabIndex={isActive ? 0 : -1}
        disabled={isDisabled}
        onClick={() => setActiveIndex(index)}
        className={cn(
          "font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-inset",
          sizeClasses[size],
          styles.base,
          isActive && styles.active,
          isFitted && "flex-1 justify-center",
          isDisabled && "opacity-50 cursor-not-allowed",
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Tab.displayName = "Tab";

// TabPanels Component
export interface TabPanelsProps extends React.HTMLAttributes<HTMLDivElement> {}

export const TabPanels = React.forwardRef<HTMLDivElement, TabPanelsProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("flex-1", className)} {...props}>
        {children}
      </div>
    );
  }
);

TabPanels.displayName = "TabPanels";

// TabPanel Component
export interface TabPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  index?: number;
}

export const TabPanel = React.forwardRef<HTMLDivElement, TabPanelProps>(
  ({ className, index = 0, children, ...props }, ref) => {
    const { activeIndex } = useTabs();
    const isActive = activeIndex === index;

    if (!isActive) return null;

    return (
      <div
        ref={ref}
        role="tabpanel"
        tabIndex={0}
        className={cn("py-4 focus:outline-none animate-fade-in", className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

TabPanel.displayName = "TabPanel";

export default Tabs;
