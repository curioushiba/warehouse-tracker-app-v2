"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PackagePlus, CheckCircle2, AlertCircle, Calendar } from "lucide-react";
import {
  Button,
  Skeleton,
  SkeletonText,
} from "@/components/ui";
import {
  getCriticalStockDetails,
  type CriticalStockItem,
} from "@/lib/actions/dashboard";
import { formatRelativeTime } from "@/lib/utils";
import { StockItemsModal } from "./StockItemsModal";

export function CriticalStockPanel() {
  const [data, setData] = useState<{ items: CriticalStockItem[]; totalCount: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      const result = await getCriticalStockDetails();
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
            <Skeleton className="w-8 h-8 rounded-full" />
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
        <p className="text-lg font-medium text-foreground-secondary">No items out of stock!</p>
        <p className="text-sm text-foreground-muted mt-1">All items have available stock.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Desktop: Table layout */}
      <div className="hidden md:block">
        {/* Header row */}
        <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-medium text-foreground-muted uppercase tracking-wide">
          <div className="col-span-1"></div>
          <div className="col-span-4">Item</div>
          <div className="col-span-3">Last Activity</div>
          <div className="col-span-2 text-right">Suggested Qty</div>
          <div className="col-span-2 text-right">Action</div>
        </div>

        {/* Data rows */}
        {data.items.slice(0, 10).map((item) => (
          <div
            key={item.id}
            className="grid grid-cols-12 gap-4 p-4 bg-white rounded-lg hover:bg-neutral-50 transition-colors items-center"
          >
            {/* Alert icon */}
            <div className="col-span-1">
              <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center">
                <AlertCircle className="w-4 h-4 text-rose-600" />
              </div>
            </div>

            {/* Item name & SKU */}
            <div className="col-span-4">
              <Link
                href={`/admin/items/${item.id}`}
                className="font-medium text-foreground hover:text-rose-700 transition-colors"
              >
                {item.name}
              </Link>
              <p className="text-xs text-foreground-muted">{item.sku}</p>
            </div>

            {/* Last transaction */}
            <div className="col-span-3">
              {item.last_transaction_date ? (
                <div className="flex items-center gap-1.5 text-sm text-foreground-secondary">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{formatRelativeTime(item.last_transaction_date)}</span>
                </div>
              ) : (
                <span className="text-sm text-foreground-placeholder italic">No transactions</span>
              )}
            </div>

            {/* Suggested reorder qty */}
            <div className="col-span-2 text-right">
              {item.suggested_reorder_qty !== null ? (
                <span className="text-sm font-medium text-foreground-secondary">
                  {item.suggested_reorder_qty}
                </span>
              ) : (
                <Link
                  href={`/admin/items/${item.id}`}
                  className="text-sm text-rose-600 hover:text-rose-700 underline"
                >
                  Set max stock
                </Link>
              )}
            </div>

            {/* Quick action */}
            <div className="col-span-2 flex items-center justify-end">
              {item.suggested_reorder_qty !== null ? (
                <Link
                  href={`/admin/transactions/new?item=${item.id}&type=check_in&quantity=${item.suggested_reorder_qty}`}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-rose-700 border-rose-300 hover:bg-rose-50"
                  >
                    <PackagePlus className="w-4 h-4 mr-1" />
                    Record In
                  </Button>
                </Link>
              ) : (
                <Link href={`/admin/items/${item.id}`}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-foreground-secondary"
                  >
                    View Item
                  </Button>
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Mobile: Card layout */}
      <div className="md:hidden space-y-3">
        {data.items.slice(0, 10).map((item) => (
          <div key={item.id} className="bg-white rounded-lg p-4 space-y-3">
            {/* Header: Icon + Name */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-rose-600" />
              </div>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/admin/items/${item.id}`}
                  className="font-medium text-foreground hover:text-rose-700 transition-colors block truncate"
                >
                  {item.name}
                </Link>
                <p className="text-xs text-foreground-muted">{item.sku}</p>
              </div>
            </div>

            {/* Last activity */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground-muted">Last activity</span>
              {item.last_transaction_date ? (
                <div className="flex items-center gap-1.5 text-foreground-secondary">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{formatRelativeTime(item.last_transaction_date)}</span>
                </div>
              ) : (
                <span className="text-foreground-placeholder italic">No transactions</span>
              )}
            </div>

            {/* Action */}
            <div className="pt-2 border-t border-border-secondary">
              {item.suggested_reorder_qty !== null ? (
                <Link
                  href={`/admin/transactions/new?item=${item.id}&type=check_in&quantity=${item.suggested_reorder_qty}`}
                  className="block"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-rose-700 border-rose-300 hover:bg-rose-50"
                  >
                    <PackagePlus className="w-4 h-4 mr-2" />
                    Record In ({item.suggested_reorder_qty})
                  </Button>
                </Link>
              ) : (
                <Link href={`/admin/items/${item.id}`} className="block">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-rose-600"
                  >
                    Set max stock
                  </Button>
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* View all link */}
      {data.totalCount > 10 && (
        <div className="pt-2 text-center">
          <Button
            variant="ghost"
            size="sm"
            className="text-rose-700"
            onClick={() => setIsModalOpen(true)}
          >
            View all {data.totalCount} out of stock items
          </Button>
        </div>
      )}

      {/* Modal for all items */}
      <StockItemsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        variant="critical"
        items={data.items}
        totalCount={data.totalCount}
      />
    </div>
  );
}
