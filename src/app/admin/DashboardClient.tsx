"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { StatCardClickable, ExpandablePanel, Badge, Progress, Spinner } from "@/components/ui";
import type { AccentColor } from "@/components/ui/ExpandableStatCard";
import {
  LowStockPanel,
  CriticalStockPanel,
  TotalItemsPanel,
  TodayTransactionsPanel,
} from "@/components/dashboard";
import {
  getCommissaryDashboardData,
  getProductionRecommendations,
} from "@/lib/actions/commissary";
import type { ProductionRecommendation } from "@/lib/supabase/types";
import { ChefHat } from "lucide-react";

type ExpandedCard = "items" | "lowStock" | "critical" | "transactions" | "commissary" | null;

interface DashboardClientProps {
  stats: {
    totalItems: number;
    lowStockItems: number;
    criticalStockItems: number;
    todayTransactions: number;
  };
}

const accentColors: Record<Exclude<ExpandedCard, null>, AccentColor> = {
  items: "emerald",
  lowStock: "amber",
  critical: "rose",
  transactions: "blue",
  commissary: "amber",
};

function CommissaryPanel() {
  const [recommendations, setRecommendations] = useState<ProductionRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getProductionRecommendations().then((result) => {
      if (result.success) {
        setRecommendations(
          result.data
            .filter((r) => r.target_today > 0 && r.produced_today < r.target_today)
            .sort((a, b) => b.priority - a.priority)
            .slice(0, 8)
        );
      }
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  }, []);

  if (isLoading) return <Spinner size="sm" />;

  if (recommendations.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-foreground-muted text-sm">All targets met for today!</p>
        <Link href="/admin/commissary" className="text-primary text-sm hover:underline mt-1 inline-block">
          View commissary dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-foreground">Priority items needing production</p>
        <Link href="/admin/commissary" className="text-primary text-sm hover:underline">
          View all
        </Link>
      </div>
      {recommendations.map((r) => {
        const pct = r.target_today > 0 ? Math.round((r.produced_today / r.target_today) * 100) : 0;
        return (
          <div key={r.item_id} className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate">{r.name}</span>
                <Badge
                  colorScheme={r.has_explicit_target ? "info" : "neutral"}
                  variant="subtle"
                  size="xs"
                >
                  {r.has_explicit_target ? "Target" : "Suggested"}
                </Badge>
              </div>
              <Progress
                value={pct}
                max={100}
                size="sm"
                colorScheme={pct >= 100 ? "success" : pct >= 50 ? "primary" : "warning"}
                className="mt-1"
              />
            </div>
            <span className="text-xs text-foreground-muted whitespace-nowrap">
              {r.produced_today}/{r.target_today} {r.unit}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function DashboardClient({ stats }: DashboardClientProps) {
  const [expandedCard, setExpandedCard] = useState<ExpandedCard>(null);
  const [commissaryStats, setCommissaryStats] = useState<{ total: number; completionPct: number } | null>(null);

  useEffect(() => {
    getCommissaryDashboardData().then((result) => {
      if (result.success) {
        setCommissaryStats({
          total: result.data.totalCommissaryItems,
          completionPct: result.data.targetCompletionPercent,
        });
      }
    });
  }, []);

  const handleToggle = useCallback((card: ExpandedCard) => {
    setExpandedCard((current) => (current === card ? null : card));
  }, []);

  const panelAccent = expandedCard !== null ? accentColors[expandedCard] : "emerald";

  return (
    <div className="space-y-4">
      {/* Cards grid - always visible */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCardClickable
          label="Total Items"
          value={stats.totalItems}
          subtitle="in inventory"
          icon="package"
          accentColor="emerald"
          isExpanded={expandedCard === "items"}
          onToggle={() => handleToggle("items")}
        />

        <StatCardClickable
          label="Low Stock Items"
          value={stats.lowStockItems}
          subtitle="need attention"
          icon="alert-triangle"
          accentColor="amber"
          isExpanded={expandedCard === "lowStock"}
          onToggle={() => handleToggle("lowStock")}
        />

        <StatCardClickable
          label="Critical Stock"
          value={stats.criticalStockItems}
          subtitle="out of stock"
          icon="alert-circle"
          accentColor="rose"
          isExpanded={expandedCard === "critical"}
          onToggle={() => handleToggle("critical")}
        />

        <StatCardClickable
          label="Today's Transactions"
          value={stats.todayTransactions}
          subtitle="today"
          icon="arrow-left-right"
          accentColor="blue"
          isExpanded={expandedCard === "transactions"}
          onToggle={() => handleToggle("transactions")}
        />

        <StatCardClickable
          label="Commissary"
          value={commissaryStats ? `${commissaryStats.completionPct}%` : "..."}
          subtitle={commissaryStats ? `${commissaryStats.total} items` : "loading"}
          icon="chef-hat"
          accentColor="amber"
          isExpanded={expandedCard === "commissary"}
          onToggle={() => handleToggle("commissary")}
        />
      </div>

      {/* Panel - renders below grid, full width */}
      <ExpandablePanel
        isExpanded={expandedCard !== null}
        accentColor={panelAccent}
      >
        {expandedCard === "items" && <TotalItemsPanel />}
        {expandedCard === "lowStock" && <LowStockPanel />}
        {expandedCard === "critical" && <CriticalStockPanel />}
        {expandedCard === "transactions" && <TodayTransactionsPanel />}
        {expandedCard === "commissary" && <CommissaryPanel />}
      </ExpandablePanel>
    </div>
  );
}
