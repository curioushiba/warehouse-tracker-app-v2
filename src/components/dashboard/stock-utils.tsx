import { type PriorityLevel } from "@/lib/actions/dashboard";

export type { PriorityLevel };

export const priorityConfig: Record<
  PriorityLevel,
  { emoji: string; label: string; color: string; bgColor: string }
> = {
  critical: { emoji: "\uD83D\uDD34", label: "Critical", color: "text-red-600", bgColor: "bg-red-100" },
  urgent: { emoji: "\uD83D\uDFE0", label: "Urgent", color: "text-orange-600", bgColor: "bg-orange-100" },
  watch: { emoji: "\uD83D\uDFE1", label: "Watch", color: "text-yellow-600", bgColor: "bg-yellow-100" },
};

export function PriorityBadge({ priority }: { priority: PriorityLevel }) {
  const config = priorityConfig[priority];
  return (
    <span className={`inline-flex items-center gap-1 text-sm px-2 py-0.5 rounded-full ${config.bgColor} ${config.color}`}>
      <span>{config.emoji}</span>
      <span className="font-medium">{config.label}</span>
    </span>
  );
}

export function formatDaysToStockout(days: number | null): string {
  if (days === null) return "No usage data";
  if (days === 0) return "Today";
  if (days === 1) return "1 day";
  return `${days} days`;
}

export function formatDailyUsage(rate: number): string {
  if (rate === 0) return "No usage data";
  if (rate < 1) return rate.toFixed(2);
  return rate.toFixed(1);
}
