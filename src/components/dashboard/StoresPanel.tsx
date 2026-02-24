"use client";

import * as React from "react";
import Link from "next/link";
import {
  Store,
  ArrowRight,
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  CheckCircle2,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardBody,
  Badge,
  Skeleton,
  Progress,
} from "@/components/ui";
import { getStoreItemsBreakdown } from "@/lib/actions/dashboard";
import type { StoreBreakdown, ProblematicItem } from "@/lib/actions/dashboard";

const MAX_VISIBLE_PER_SECTION = 5;

// ---------------------------------------------------------------------------
// Urgency helpers
// ---------------------------------------------------------------------------

function getUrgency(store: StoreBreakdown) {
  if (store.criticalStockCount > 0) return "critical" as const;
  if (store.lowStockCount > 0) return "warning" as const;
  return "healthy" as const;
}

const urgencyStyles = {
  critical: {
    border: "border-l-rose-400",
    iconBg: "bg-rose-50",
    iconText: "text-rose-600",
    expandedBg: "bg-rose-50/40",
  },
  warning: {
    border: "border-l-amber-400",
    iconBg: "bg-amber-50",
    iconText: "text-amber-600",
    expandedBg: "bg-amber-50/40",
  },
  healthy: {
    border: "border-l-transparent",
    iconBg: "bg-neutral-50",
    iconText: "text-neutral-400",
    expandedBg: "",
  },
} as const;

// ---------------------------------------------------------------------------
// ProblematicItemRow — compact, no redundant badge
// ---------------------------------------------------------------------------

function ProblematicItemRow({ item }: { item: ProblematicItem }) {
  const isCritical = item.level === "critical";
  const progressValue =
    item.minStock > 0
      ? Math.min(100, (item.currentStock / item.minStock) * 100)
      : 0;

  return (
    <Link
      href={`/admin/items/${item.id}`}
      className="group flex items-center gap-2 py-1 px-1.5 -mx-1.5 rounded transition-colors hover:bg-white/80"
    >
      {/* Name — primary element */}
      <span className="text-[13px] text-foreground group-hover:text-primary transition-colors truncate min-w-0 flex-1">
        {item.name}
      </span>

      {/* Stock ratio — color-coded inline */}
      <span
        className={`text-xs tabular-nums whitespace-nowrap ${
          isCritical
            ? "text-rose-600 font-medium"
            : "text-amber-700"
        }`}
      >
        {item.currentStock}/{item.minStock}
      </span>

      {/* Unit — quiet */}
      <span className="text-[11px] text-foreground-placeholder whitespace-nowrap w-6">
        {item.unit}
      </span>

      {/* Progress — only for low stock (meaningful); skip for 0-stock (empty bar = noise) */}
      {!isCritical ? (
        <Progress
          size="xs"
          colorScheme="warning"
          value={progressValue}
          className="w-12 shrink-0"
          aria-label={`Stock level for ${item.name}`}
        />
      ) : (
        <div className="w-12 shrink-0" />
      )}
    </Link>
  );
}

// ---------------------------------------------------------------------------
// ItemSection — one urgency tier within the expanded panel
// ---------------------------------------------------------------------------

function ItemSection({
  items,
  level,
  storeId,
}: {
  items: ProblematicItem[];
  level: "critical" | "low";
  storeId: string | null;
}) {
  const isCritical = level === "critical";
  const visible = items.slice(0, MAX_VISIBLE_PER_SECTION);
  const overflow = items.length - visible.length;

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center gap-1.5 mb-1">
        {isCritical ? (
          <AlertCircle className="w-3 h-3 text-rose-500" />
        ) : (
          <AlertTriangle className="w-3 h-3 text-amber-500" />
        )}
        <span
          className={`text-[11px] font-semibold uppercase tracking-wider ${
            isCritical ? "text-rose-500" : "text-amber-600"
          }`}
        >
          {isCritical ? "Out of stock" : "Low stock"} ({items.length})
        </span>
      </div>

      {/* Item rows */}
      <div>
        {visible.map((item) => (
          <ProblematicItemRow key={item.id} item={item} />
        ))}
      </div>

      {/* Overflow link */}
      {overflow > 0 && (
        <Link
          href={`/admin/items?store=${storeId ?? ""}&stock=${level}`}
          className="inline-flex items-center gap-0.5 text-[11px] font-medium text-foreground-muted hover:text-primary transition-colors mt-0.5 ml-1.5"
        >
          +{overflow} more
          <ArrowRight className="w-2.5 h-2.5" />
        </Link>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ExpandedStoreItems — contained, capped, scannable
// ---------------------------------------------------------------------------

function ExpandedStoreItems({
  store,
  tintClass,
}: {
  store: StoreBreakdown;
  tintClass: string;
}) {
  const critical = store.problematicItems.filter((i) => i.level === "critical");
  const low = store.problematicItems.filter((i) => i.level === "low");

  return (
    <div className={`rounded-lg mx-1 mt-1 mb-2 px-3 py-2.5 ${tintClass}`}>
      <div className="space-y-3">
        {critical.length > 0 && (
          <ItemSection items={critical} level="critical" storeId={store.id} />
        )}
        {low.length > 0 && (
          <ItemSection items={low} level="low" storeId={store.id} />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// StoresPanel
// ---------------------------------------------------------------------------

export function StoresPanel() {
  const [stores, setStores] = React.useState<StoreBreakdown[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [expandedStores, setExpandedStores] = React.useState<Set<string>>(
    new Set()
  );

  React.useEffect(() => {
    async function fetchData() {
      try {
        const result = await getStoreItemsBreakdown();
        if (result.success) {
          setStores(result.data.stores);
        }
      } catch (err) {
        console.error("Error fetching store breakdown:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const toggleStore = React.useCallback((key: string) => {
    setExpandedStores((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  if (isLoading) {
    return (
      <Card variant="elevated">
        <CardHeader className="p-5 pb-0">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3.5 w-48 mt-1.5" />
        </CardHeader>
        <CardBody className="p-5 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2.5 py-2 px-3">
              <Skeleton className="w-7 h-7 rounded-md shrink-0" />
              <Skeleton className="h-3.5 w-24" />
              <div className="flex-1" />
              <Skeleton className="h-4 w-10 rounded-full" />
              <Skeleton className="h-4 w-10 rounded-full" />
            </div>
          ))}
        </CardBody>
      </Card>
    );
  }

  if (stores.length === 0) return null;

  const totalProblems = stores.reduce(
    (sum, s) => sum + s.criticalStockCount + s.lowStockCount,
    0
  );
  const problemStoreCount = stores.filter(
    (s) => s.criticalStockCount > 0 || s.lowStockCount > 0
  ).length;

  return (
    <Card variant="elevated">
      <CardHeader className="p-5 pb-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Store className="w-4 h-4 text-foreground-muted" />
            <h3 className="text-sm font-semibold text-foreground">
              Items by Store
            </h3>
          </div>
          {totalProblems > 0 && (
            <span className="text-xs text-foreground-muted">
              {totalProblems} issue{totalProblems !== 1 ? "s" : ""} in{" "}
              {problemStoreCount} store{problemStoreCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </CardHeader>

      <CardBody className="p-5 pt-4">
        {/* All-healthy state */}
        {totalProblems === 0 && (
          <div className="flex items-center gap-2.5 py-3 px-3 mb-3 rounded-lg bg-emerald-50/60">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <div>
              <p className="text-sm font-medium text-emerald-800">
                All stores healthy
              </p>
              <p className="text-xs text-emerald-600/70">
                {stores.length} store{stores.length !== 1 ? "s" : ""}, no stock
                issues
              </p>
            </div>
          </div>
        )}

        {/* Store rows */}
        <div className="space-y-0.5">
          {stores.map((store) => {
            const key = store.id ?? "no-store";
            const urgency = getUrgency(store);
            const styles = urgencyStyles[urgency];
            const hasProblems = urgency !== "healthy";
            const isExpanded = expandedStores.has(key);

            return (
              <div key={key}>
                <button
                  type="button"
                  onClick={hasProblems ? () => toggleStore(key) : undefined}
                  aria-expanded={hasProblems ? isExpanded : undefined}
                  className={`
                    flex items-center justify-between w-full py-2 px-3 rounded-md
                    border-l-[3px] transition-colors text-left
                    ${styles.border}
                    ${hasProblems ? "hover:bg-neutral-50 cursor-pointer" : "cursor-default"}
                    ${isExpanded ? "bg-neutral-50/60" : ""}
                  `}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${styles.iconBg}`}
                    >
                      <Store className={`w-3.5 h-3.5 ${styles.iconText}`} />
                    </div>
                    <span className="font-medium text-foreground text-sm truncate">
                      {store.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {store.criticalStockCount > 0 && (
                      <Badge colorScheme="error" variant="subtle" size="sm">
                        {store.criticalStockCount} out
                      </Badge>
                    )}
                    {store.lowStockCount > 0 && (
                      <Badge colorScheme="warning" variant="subtle" size="sm">
                        {store.lowStockCount} low
                      </Badge>
                    )}
                    <Badge colorScheme="neutral" variant="subtle" size="sm">
                      {store.count}
                    </Badge>
                    {hasProblems && (
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-foreground-placeholder transition-transform duration-200 ml-0.5 ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      />
                    )}
                  </div>
                </button>

                {/* Expandable detail panel */}
                {hasProblems && (
                  <div
                    className={`grid transition-all duration-200 ease-in-out ${
                      isExpanded
                        ? "grid-rows-[1fr] opacity-100"
                        : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <ExpandedStoreItems
                        store={store}
                        tintClass={styles.expandedBg}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-border">
          <Link
            href="/admin/stores"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-dark transition-colors"
          >
            Manage Stores
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </CardBody>
    </Card>
  );
}

export default StoresPanel;
