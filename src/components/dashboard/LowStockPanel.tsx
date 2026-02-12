"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PackagePlus, CheckCircle2 } from "lucide-react";
import {
  Button,
  Progress,
  Skeleton,
  SkeletonText,
} from "@/components/ui";
import {
  getLowStockDetails,
  type LowStockDetailItem,
} from "@/lib/actions/dashboard";
import { StockItemsModal } from "./StockItemsModal";
import {
  PriorityBadge,
  formatDaysToStockout,
  formatDailyUsage,
  type PriorityLevel,
} from "./stock-utils";

function getProgressColorScheme(priority: PriorityLevel): "error" | "warning" | "success" {
  switch (priority) {
    case "critical": return "error";
    case "urgent": return "warning";
    default: return "success";
  }
}

function getDaysLeftColorClass(daysToStockout: number | null): string {
  if (daysToStockout !== null && daysToStockout <= 3) return "text-red-600";
  if (daysToStockout !== null && daysToStockout <= 7) return "text-orange-600";
  return "text-foreground-secondary";
}

export function LowStockPanel() {
  const [data, setData] = useState<{ items: LowStockDetailItem[]; totalCount: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      const result = await getLowStockDetails();
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error);
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4 p-3 bg-white rounded-lg">
            <Skeleton className="w-16 h-6" />
            <div className="flex-1">
              <SkeletonText lines={1} className="w-32" />
            </div>
            <Skeleton className="w-24 h-4" />
            <Skeleton className="w-20 h-8" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-6 text-red-600">
        <p>Failed to load data: {error}</p>
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="text-center py-8">
        <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500 mb-3" />
        <p className="text-lg font-medium text-foreground-secondary">All items well stocked!</p>
        <p className="text-sm text-foreground-muted mt-1">No items are below their minimum stock level.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Desktop: Table layout */}
      <div className="hidden md:block">
        {/* Header row */}
        <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-medium text-foreground-muted uppercase tracking-wide">
          <div className="col-span-2">Priority</div>
          <div className="col-span-3">Item</div>
          <div className="col-span-2">Stock Level</div>
          <div className="col-span-1 text-right">Daily</div>
          <div className="col-span-2 text-right">Days Left</div>
          <div className="col-span-2 text-right">Reorder</div>
        </div>

        {/* Data rows */}
        {data.items.slice(0, 10).map((item) => {
          const minStock = item.min_stock ?? 0;
          const percentage = minStock > 0 ? (item.current_stock / minStock) * 100 : 0;
          const reorderQty = item.reorder_quantity;

          return (
            <div
              key={item.id}
              className="grid grid-cols-12 gap-4 p-4 bg-white rounded-lg hover:bg-neutral-50 transition-colors items-center"
            >
              {/* Priority */}
              <div className="col-span-2">
                <PriorityBadge priority={item.priority} />
              </div>

              {/* Item name & SKU */}
              <div className="col-span-3">
                <Link
                  href={`/admin/items/${item.id}`}
                  className="font-medium text-foreground hover:text-amber-700 transition-colors"
                >
                  {item.name}
                </Link>
                <p className="text-xs text-foreground-muted">{item.sku}</p>
              </div>

              {/* Stock level progress */}
              <div className="col-span-2 flex items-center gap-2">
                <Progress
                  value={Math.min(percentage, 100)}
                  colorScheme={getProgressColorScheme(item.priority)}
                  size="sm"
                  className="w-16"
                  aria-label={`${percentage.toFixed(0)}% of minimum stock`}
                />
                <span className="text-sm text-foreground-secondary whitespace-nowrap">
                  {item.current_stock} / {minStock}
                </span>
              </div>

              {/* Daily usage */}
              <div className="col-span-1 text-right">
                <span className="text-sm text-foreground-secondary">
                  {formatDailyUsage(item.daily_consumption_rate)}
                </span>
              </div>

              {/* Days to stockout */}
              <div className="col-span-2 text-right">
                <span className={`text-sm font-medium ${getDaysLeftColorClass(item.days_to_stockout)}`}>
                  {formatDaysToStockout(item.days_to_stockout)}
                </span>
              </div>

              {/* Reorder / Quick action */}
              <div className="col-span-2 flex items-center justify-end gap-2">
                {reorderQty !== null ? (
                  <>
                    <span className="text-sm text-foreground-secondary">{reorderQty}</span>
                    <Link
                      href={`/admin/transactions/new?item=${item.id}&type=check_in&quantity=${reorderQty}`}
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-amber-700 border-amber-300 hover:bg-amber-50"
                      >
                        <PackagePlus className="w-4 h-4 mr-1" />
                        Record In
                      </Button>
                    </Link>
                  </>
                ) : (
                  <Link
                    href={`/admin/items/${item.id}`}
                    className="text-sm text-amber-600 hover:text-amber-700 underline"
                  >
                    Set max stock
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile: Card layout */}
      <div className="md:hidden space-y-3">
        {data.items.slice(0, 10).map((item) => {
          const minStock = item.min_stock ?? 0;
          const percentage = minStock > 0 ? (item.current_stock / minStock) * 100 : 0;
          const reorderQty = item.reorder_quantity;

          return (
            <div key={item.id} className="bg-white rounded-lg p-4 space-y-3">
              {/* Header: Name + Priority */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/admin/items/${item.id}`}
                    className="font-medium text-foreground hover:text-amber-700 transition-colors block truncate"
                  >
                    {item.name}
                  </Link>
                  <p className="text-xs text-foreground-muted">{item.sku}</p>
                </div>
                <PriorityBadge priority={item.priority} />
              </div>

              {/* Stock level */}
              <div className="flex items-center gap-3">
                <Progress
                  value={Math.min(percentage, 100)}
                  colorScheme={getProgressColorScheme(item.priority)}
                  size="sm"
                  className="flex-1"
                  aria-label={`${percentage.toFixed(0)}% of minimum stock`}
                />
                <span className="text-sm text-foreground-secondary whitespace-nowrap">
                  {item.current_stock} / {minStock}
                </span>
              </div>

              {/* Stats row */}
              <div className="flex items-center justify-between text-sm text-foreground-secondary">
                <span>Daily: {formatDailyUsage(item.daily_consumption_rate)}</span>
                <span className={`font-medium ${getDaysLeftColorClass(item.days_to_stockout)}`}>
                  {formatDaysToStockout(item.days_to_stockout)} left
                </span>
              </div>

              {/* Action */}
              <div className="pt-2 border-t border-border-secondary">
                {reorderQty !== null ? (
                  <Link
                    href={`/admin/transactions/new?item=${item.id}&type=check_in&quantity=${reorderQty}`}
                    className="block"
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-amber-700 border-amber-300 hover:bg-amber-50"
                    >
                      <PackagePlus className="w-4 h-4 mr-2" />
                      Record In ({reorderQty})
                    </Button>
                  </Link>
                ) : (
                  <Link href={`/admin/items/${item.id}`} className="block">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-amber-600"
                    >
                      Set max stock
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* View all link */}
      {data.totalCount > 10 && (
        <div className="pt-2 text-center">
          <Button
            variant="ghost"
            size="sm"
            className="text-amber-700"
            onClick={() => setIsModalOpen(true)}
          >
            View all {data.totalCount} low stock items
          </Button>
        </div>
      )}

      {/* Modal for all items */}
      <StockItemsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        variant="low"
        items={data.items}
        totalCount={data.totalCount}
      />
    </div>
  );
}
