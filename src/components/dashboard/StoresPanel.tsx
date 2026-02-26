"use client";

import * as React from "react";
import Link from "next/link";
import {
  Store,
  ArrowRight,
  AlertCircle,
  AlertTriangle,
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

// ---------------------------------------------------------------------------
// Urgency helpers
// ---------------------------------------------------------------------------

function getUrgency(store: StoreBreakdown) {
  if (store.criticalStockCount > 0) return "critical" as const;
  if (store.lowStockCount > 0) return "warning" as const;
  return "healthy" as const;
}

type Urgency = ReturnType<typeof getUrgency>;

const urgencyColor: Record<Urgency, string> = {
  critical: "border-l-rose-400",
  warning: "border-l-amber-400",
  healthy: "border-l-transparent",
};

const urgencyDot: Record<Urgency, string> = {
  critical: "bg-rose-500",
  warning: "bg-amber-500",
  healthy: "",
};

// ---------------------------------------------------------------------------
// ProblematicItemRow
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
      <span className="text-[13px] text-foreground group-hover:text-primary transition-colors truncate min-w-0 flex-1">
        {item.name}
      </span>

      <span
        className={`text-xs tabular-nums whitespace-nowrap ${
          isCritical ? "text-rose-600 font-medium" : "text-amber-700"
        }`}
      >
        {item.currentStock}/{item.minStock}
      </span>

      <span className="text-[11px] text-foreground-placeholder whitespace-nowrap w-6">
        {item.unit}
      </span>

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
// ItemSection — one urgency tier (no item cap)
// ---------------------------------------------------------------------------

function ItemSection({
  items,
  level,
}: {
  items: ProblematicItem[];
  level: "critical" | "low";
}) {
  const isCritical = level === "critical";

  return (
    <div>
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

      <div>
        {items.map((item) => (
          <ProblematicItemRow key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DetailPane — right panel content
// ---------------------------------------------------------------------------

function DetailPane({ store }: { store: StoreBreakdown }) {
  const critical = store.problematicItems.filter((i) => i.level === "critical");
  const low = store.problematicItems.filter((i) => i.level === "low");
  const hasProblems = critical.length > 0 || low.length > 0;

  return (
    <div key={store.id ?? "no-store"} className="animate-fade-in">
      {/* Store name header (visible on mobile, hidden on desktop where list shows it) */}
      <div className="flex items-center gap-2 mb-3 md:mb-2">
        <h4 className="text-sm font-semibold text-foreground truncate">
          {store.name}
        </h4>
        <div className="flex items-center gap-1.5 shrink-0">
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
        </div>
      </div>

      {hasProblems ? (
        <div className="space-y-3">
          {critical.length > 0 && (
            <ItemSection items={critical} level="critical" />
          )}
          {low.length > 0 && <ItemSection items={low} level="low" />}

          {/* Footer link to full items page for this store */}
          <Link
            href={`/admin/items?store=${store.id ?? ""}`}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary-dark transition-colors mt-1"
          >
            View all {store.count} items
            <ArrowRight className="w-2.5 h-2.5" />
          </Link>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mb-2" />
          <p className="text-sm font-medium text-emerald-700">
            Store is healthy
          </p>
          <p className="text-xs text-foreground-muted mt-0.5">
            All {store.count} items are well-stocked
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// StoreListItem — desktop left panel entry
// ---------------------------------------------------------------------------

function StoreListItem({
  store,
  isSelected,
  onClick,
}: {
  store: StoreBreakdown;
  isSelected: boolean;
  onClick: () => void;
}) {
  const urgency = getUrgency(store);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        flex items-center gap-2 w-full py-2 px-3 text-left
        border-l-[3px] transition-colors text-sm
        ${urgencyColor[urgency]}
        ${isSelected ? "bg-neutral-50 border-l-primary" : "hover:bg-neutral-50/60"}
      `}
    >
      <Store
        className={`w-3.5 h-3.5 shrink-0 ${
          isSelected ? "text-primary" : "text-foreground-muted"
        }`}
      />
      <span className="truncate flex-1 font-medium text-foreground">
        {store.name}
      </span>
      <div className="flex items-center gap-1 shrink-0">
        {store.criticalStockCount > 0 && (
          <Badge colorScheme="error" variant="subtle" size="xs">
            {store.criticalStockCount}
          </Badge>
        )}
        {store.lowStockCount > 0 && (
          <Badge colorScheme="warning" variant="subtle" size="xs">
            {store.lowStockCount}
          </Badge>
        )}
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// StorePill — mobile horizontal strip entry
// ---------------------------------------------------------------------------

function StorePill({
  store,
  isSelected,
  onClick,
}: {
  store: StoreBreakdown;
  isSelected: boolean;
  onClick: () => void;
}) {
  const urgency = getUrgency(store);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        shrink-0 px-3 py-1.5 rounded-full text-sm border transition-colors
        ${
          isSelected
            ? "bg-primary text-white border-primary"
            : "bg-white text-foreground border-border hover:border-neutral-300"
        }
      `}
    >
      <span className="flex items-center gap-1.5">
        {store.name}
        {urgency !== "healthy" && (
          <span
            className={`w-1.5 h-1.5 rounded-full ${urgencyDot[urgency]}`}
          />
        )}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// StoresPanel
// ---------------------------------------------------------------------------

export function StoresPanel() {
  const [stores, setStores] = React.useState<StoreBreakdown[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedStoreKey, setSelectedStoreKey] = React.useState<string | null>(
    null
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

  // Auto-select first problem store (or first store)
  React.useEffect(() => {
    if (stores.length > 0 && selectedStoreKey === null) {
      const first = stores.find(
        (s) => s.criticalStockCount > 0 || s.lowStockCount > 0
      );
      setSelectedStoreKey(
        first ? (first.id ?? "no-store") : (stores[0].id ?? "no-store")
      );
    }
  }, [stores, selectedStoreKey]);

  const selectedStore = React.useMemo(
    () =>
      stores.find(
        (s) => (s.id ?? "no-store") === selectedStoreKey
      ) ?? null,
    [stores, selectedStoreKey]
  );

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

  const selectStore = (store: StoreBreakdown) =>
    setSelectedStoreKey(store.id ?? "no-store");

  return (
    <Card variant="elevated" className="flex flex-col">
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

      <CardBody className="p-0 pt-4 flex-1 min-h-0 flex flex-col">
        {/* Mobile pill strip */}
        <div className="md:hidden px-5 pb-3 overflow-x-auto flex gap-2 scrollbar-hide">
          {stores.map((store) => (
            <StorePill
              key={store.id ?? "no-store"}
              store={store}
              isSelected={
                (store.id ?? "no-store") === selectedStoreKey
              }
              onClick={() => selectStore(store)}
            />
          ))}
        </div>

        {/* Desktop: two-panel layout */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row max-h-[420px]">
          {/* Desktop store list (left panel) */}
          <div className="hidden md:flex flex-col w-[220px] shrink-0 border-r border-border overflow-y-auto">
            {stores.map((store) => (
              <StoreListItem
                key={store.id ?? "no-store"}
                store={store}
                isSelected={
                  (store.id ?? "no-store") === selectedStoreKey
                }
                onClick={() => selectStore(store)}
              />
            ))}
          </div>

          {/* Detail pane (right panel) */}
          <div data-testid="store-detail-pane" className="flex-1 overflow-y-auto px-5 py-3 relative max-h-[320px] md:max-h-none">
            {selectedStore ? (
              <DetailPane store={selectedStore} />
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-foreground-muted">
                Select a store to view details
              </div>
            )}

            {/* Bottom scroll fade */}
            <div className="sticky bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white to-transparent pointer-events-none" />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border">
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
