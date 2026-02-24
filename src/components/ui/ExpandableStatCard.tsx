"use client";

import { ReactNode } from "react";
import {
  ChevronDown,
  Package,
  AlertTriangle,
  AlertCircle,
  ArrowLeftRight,
  ChefHat,
  type LucideIcon,
} from "lucide-react";

export type AccentColor = "emerald" | "amber" | "rose" | "blue";

export type IconName =
  | "package"
  | "alert-triangle"
  | "alert-circle"
  | "arrow-left-right"
  | "chef-hat";

const iconMap: Record<IconName, LucideIcon> = {
  package: Package,
  "alert-triangle": AlertTriangle,
  "alert-circle": AlertCircle,
  "arrow-left-right": ArrowLeftRight,
  "chef-hat": ChefHat,
};

export const colors: Record<
  AccentColor,
  {
    gradient: string;
    bg: string;
    border: string;
    blob: string;
    shadow: string;
    action: string;
    ring: string;
    expandedBg: string;
    expandedBorder: string;
  }
> = {
  emerald: {
    gradient: "from-emerald-600 to-emerald-700",
    bg: "to-emerald-50/50",
    border: "border-emerald-100/50 hover:border-emerald-200",
    blob: "from-emerald-100/60",
    shadow: "shadow-emerald-200/50",
    action: "text-emerald-700",
    ring: "focus:ring-emerald-500",
    expandedBg: "bg-emerald-50/30",
    expandedBorder: "border-emerald-200",
  },
  amber: {
    gradient: "from-amber-600 to-amber-700",
    bg: "to-amber-50/50",
    border: "border-amber-100/50 hover:border-amber-200",
    blob: "from-amber-100/60",
    shadow: "shadow-amber-200/50",
    action: "text-amber-700",
    ring: "focus:ring-amber-500",
    expandedBg: "bg-amber-50/30",
    expandedBorder: "border-amber-200",
  },
  rose: {
    gradient: "from-rose-600 to-rose-700",
    bg: "to-rose-50/50",
    border: "border-rose-100/50 hover:border-rose-200",
    blob: "from-rose-100/60",
    shadow: "shadow-rose-200/50",
    action: "text-rose-700",
    ring: "focus:ring-rose-500",
    expandedBg: "bg-rose-50/30",
    expandedBorder: "border-rose-200",
  },
  blue: {
    gradient: "from-blue-600 to-blue-700",
    bg: "to-blue-50/50",
    border: "border-blue-100/50 hover:border-blue-200",
    blob: "from-blue-100/60",
    shadow: "shadow-blue-200/50",
    action: "text-blue-700",
    ring: "focus:ring-blue-500",
    expandedBg: "bg-blue-50/30",
    expandedBorder: "border-blue-200",
  },
};

// =============================================================================
// StatCardClickable - Just the clickable card button (no panel)
// =============================================================================
export interface StatCardClickableProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: IconName;
  accentColor: AccentColor;
  isExpanded: boolean;
  onToggle: () => void;
}

export function StatCardClickable({
  label,
  value,
  subtitle,
  icon,
  accentColor,
  isExpanded,
  onToggle,
}: StatCardClickableProps) {
  const c = colors[accentColor];
  const Icon = iconMap[icon];

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isExpanded}
      aria-label={`${label}: ${value}${subtitle ? ` ${subtitle}` : ""}. Click to ${isExpanded ? "collapse" : "expand"} details.`}
      className={`
        group relative w-full overflow-hidden rounded-2xl p-5 text-left
        bg-gradient-to-br from-white ${c.bg}
        shadow-sm hover:shadow-lg transition-all duration-300 ease-out
        border ${c.border}
        focus:outline-none focus:ring-2 focus:ring-offset-2 ${c.ring}
        active:scale-[0.98]
        cursor-pointer
        ${isExpanded ? "ring-2 ring-offset-2 " + c.ring.replace("focus:", "") : ""}
      `}
    >
      {/* Decorative gradient blob - top right */}
      <div
        className={`
          absolute top-0 right-0 w-24 h-24
          bg-gradient-to-bl ${c.blob} to-transparent
          rounded-bl-full
          opacity-60 group-hover:opacity-100
          transition-opacity duration-300
          pointer-events-none
        `}
      />

      {/* Content container */}
      <div className="relative">
        {/* Top row: Icon and expand indicator */}
        <div className="flex items-start justify-between mb-4">
          <div
            className={`
              w-11 h-11 rounded-xl
              bg-gradient-to-br ${c.gradient}
              flex items-center justify-center
              shadow-sm ${c.shadow}
              group-hover:scale-105 transition-transform duration-200
            `}
          >
            <Icon className="w-5 h-5 text-white" strokeWidth={1.75} />
          </div>
          <ChevronDown
            className={`
              w-5 h-5 text-foreground-placeholder transition-transform duration-300
              ${isExpanded ? "rotate-180" : ""}
            `}
          />
        </div>

        {/* Label */}
        <div className="text-sm font-medium text-foreground-muted mb-1">{label}</div>

        {/* Value + Subtitle */}
        <div className="flex items-baseline gap-3">
          <span className="text-4xl font-bold text-foreground tracking-tight">
            {typeof value === "number" ? value.toLocaleString() : value}
          </span>
          {subtitle && <span className="text-sm text-foreground-placeholder">{subtitle}</span>}
        </div>

      </div>
    </button>
  );
}

// =============================================================================
// ExpandablePanel - Animated panel wrapper for content below the grid
// =============================================================================
export interface ExpandablePanelProps {
  isExpanded: boolean;
  accentColor: AccentColor;
  children: ReactNode;
}

export function ExpandablePanel({
  isExpanded,
  accentColor,
  children,
}: ExpandablePanelProps) {
  const c = colors[accentColor];

  return (
    <div
      className={`
        grid transition-all duration-300 ease-in-out
        ${isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}
      `}
    >
      <div className="overflow-hidden">
        <div
          className={`
            p-4 md:p-6 rounded-2xl ${c.expandedBg}
            border ${c.expandedBorder}
          `}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

