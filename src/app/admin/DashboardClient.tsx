"use client";

import { useState, useCallback } from "react";
import { StatCardClickable, ExpandablePanel } from "@/components/ui";
import type { AccentColor } from "@/components/ui/ExpandableStatCard";
import {
  LowStockPanel,
  CriticalStockPanel,
  TotalItemsPanel,
  TodayTransactionsPanel,
} from "@/components/dashboard";

type ExpandedCard = "items" | "lowStock" | "critical" | "transactions" | null;

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
};

export function DashboardClient({ stats }: DashboardClientProps) {
  const [expandedCard, setExpandedCard] = useState<ExpandedCard>(null);

  const handleToggle = useCallback((card: ExpandedCard) => {
    setExpandedCard((current) => (current === card ? null : card));
  }, []);

  const panelAccent = expandedCard !== null ? accentColors[expandedCard] : "emerald";

  return (
    <div className="space-y-4">
      {/* Cards grid - always visible */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
      </ExpandablePanel>
    </div>
  );
}
