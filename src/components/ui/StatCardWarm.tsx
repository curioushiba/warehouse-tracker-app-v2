"use client";

import {
  ChevronRight,
  Package,
  AlertTriangle,
  AlertCircle,
  ArrowLeftRight,
  DollarSign,
  ShoppingCart,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

export type AccentColor = "emerald" | "amber" | "rose" | "blue";

export type IconName =
  | "package"
  | "alert-triangle"
  | "alert-circle"
  | "arrow-left-right"
  | "dollar-sign"
  | "shopping-cart"
  | "users";

const iconMap: Record<IconName, LucideIcon> = {
  package: Package,
  "alert-triangle": AlertTriangle,
  "alert-circle": AlertCircle,
  "arrow-left-right": ArrowLeftRight,
  "dollar-sign": DollarSign,
  "shopping-cart": ShoppingCart,
  users: Users,
};

export interface StatCardWarmProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: IconName;
  accentColor: AccentColor;
  href?: string;
}

const colors: Record<
  AccentColor,
  {
    gradient: string;
    bg: string;
    border: string;
    blob: string;
    shadow: string;
    action: string;
    ring: string;
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
  },
  amber: {
    gradient: "from-amber-600 to-amber-700",
    bg: "to-amber-50/50",
    border: "border-amber-100/50 hover:border-amber-200",
    blob: "from-amber-100/60",
    shadow: "shadow-amber-200/50",
    action: "text-amber-700",
    ring: "focus:ring-amber-500",
  },
  rose: {
    gradient: "from-rose-600 to-rose-700",
    bg: "to-rose-50/50",
    border: "border-rose-100/50 hover:border-rose-200",
    blob: "from-rose-100/60",
    shadow: "shadow-rose-200/50",
    action: "text-rose-700",
    ring: "focus:ring-rose-500",
  },
  blue: {
    gradient: "from-blue-600 to-blue-700",
    bg: "to-blue-50/50",
    border: "border-blue-100/50 hover:border-blue-200",
    blob: "from-blue-100/60",
    shadow: "shadow-blue-200/50",
    action: "text-blue-700",
    ring: "focus:ring-blue-500",
  },
};

export function StatCardWarm({
  label,
  value,
  subtitle,
  icon,
  accentColor,
  href,
}: StatCardWarmProps) {
  const c = colors[accentColor];
  const Icon = iconMap[icon];

  const cardContent = (
    <button
      type="button"
      aria-label={`${label}: ${value}${subtitle ? ` ${subtitle}` : ""}. ${href ? "Click to view details." : ""}`}
      className={`
        group relative w-full overflow-hidden rounded-2xl p-5 text-left
        bg-gradient-to-br from-white ${c.bg}
        shadow-sm hover:shadow-lg transition-all duration-300 ease-out
        border ${c.border}
        focus:outline-none focus:ring-2 focus:ring-offset-2 ${c.ring}
        active:scale-[0.98]
        ${href ? "cursor-pointer" : "cursor-default"}
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
        {/* Icon */}
        <div
          className={`
            w-11 h-11 rounded-xl
            bg-gradient-to-br ${c.gradient}
            flex items-center justify-center
            mb-4
            shadow-sm ${c.shadow}
            group-hover:scale-105 transition-transform duration-200
          `}
        >
          <Icon className="w-5 h-5 text-white" strokeWidth={1.75} />
        </div>

        {/* Label */}
        <div className="text-sm font-medium text-stone-500 mb-1">{label}</div>

        {/* Value + Subtitle */}
        <div className="flex items-baseline gap-3">
          <span className="text-4xl font-bold text-stone-800 tracking-tight">
            {typeof value === "number" ? value.toLocaleString() : value}
          </span>
          {subtitle && <span className="text-sm text-stone-400">{subtitle}</span>}
        </div>

        {/* Hover action */}
        {href && (
          <div
            className={`
              mt-4 flex items-center text-sm font-medium ${c.action}
              opacity-0 group-hover:opacity-100 transition-opacity duration-200
            `}
          >
            View details
            <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform duration-200" />
          </div>
        )}
      </div>
    </button>
  );

  if (href) {
    return <Link href={href}>{cardContent}</Link>;
  }

  return cardContent;
}
