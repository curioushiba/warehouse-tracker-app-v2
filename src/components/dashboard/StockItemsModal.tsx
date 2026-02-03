"use client";

import Link from "next/link";
import { AlertCircle, Calendar, ExternalLink } from "lucide-react";
import {
  Modal,
  ModalHeader,
  ModalBody,
  Button,
  Progress,
} from "@/components/ui";
import {
  type CriticalStockItem,
  type LowStockDetailItem,
} from "@/lib/actions/dashboard";
import { formatRelativeTime } from "@/lib/utils";
import {
  PriorityBadge,
  formatDaysToStockout,
  formatDailyUsage,
} from "./stock-utils";

interface StockItemsModalProps {
  isOpen: boolean;
  onClose: () => void;
  variant: "critical" | "low";
  items: CriticalStockItem[] | LowStockDetailItem[];
  totalCount: number;
}

export function StockItemsModal({
  isOpen,
  onClose,
  variant,
  items,
  totalCount,
}: StockItemsModalProps) {
  const title = variant === "critical"
    ? `Out of Stock Items (${totalCount})`
    : `Low Stock Items (${totalCount})`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      scrollBehavior="inside"
    >
      <ModalHeader onClose={onClose}>{title}</ModalHeader>
      <ModalBody className="p-0">
        {variant === "critical" ? (
          <CriticalStockList items={items as CriticalStockItem[]} />
        ) : (
          <LowStockList items={items as LowStockDetailItem[]} />
        )}
      </ModalBody>
    </Modal>
  );
}

function CriticalStockList({ items }: { items: CriticalStockItem[] }) {
  return (
    <div className="divide-y divide-stone-100">
      {/* Desktop: Table layout */}
      <div className="hidden md:block">
        {/* Header row */}
        <div className="grid grid-cols-12 gap-4 px-6 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide bg-stone-50 border-b border-stone-100">
          <div className="col-span-1"></div>
          <div className="col-span-5">Item</div>
          <div className="col-span-4">Last Activity</div>
          <div className="col-span-2 text-right">Action</div>
        </div>

        {/* Data rows */}
        {items.map((item) => (
          <div
            key={item.id}
            className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-stone-50 transition-colors items-center"
          >
            {/* Alert icon */}
            <div className="col-span-1">
              <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center">
                <AlertCircle className="w-4 h-4 text-rose-600" />
              </div>
            </div>

            {/* Item name & SKU */}
            <div className="col-span-5">
              <p className="font-medium text-stone-800">{item.name}</p>
              <p className="text-xs text-stone-500">{item.sku}</p>
            </div>

            {/* Last transaction */}
            <div className="col-span-4">
              {item.last_transaction_date ? (
                <div className="flex items-center gap-1.5 text-sm text-stone-600">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{formatRelativeTime(item.last_transaction_date)}</span>
                </div>
              ) : (
                <span className="text-sm text-stone-400 italic">No transactions</span>
              )}
            </div>

            {/* View Item link */}
            <div className="col-span-2 flex items-center justify-end">
              <Link href={`/admin/items/${item.id}`}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-rose-600 hover:text-rose-700"
                >
                  View Item
                  <ExternalLink className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Mobile: Card layout */}
      <div className="md:hidden">
        {items.map((item) => (
          <div key={item.id} className="p-4 space-y-3 border-b border-stone-100 last:border-b-0">
            {/* Header: Icon + Name */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-rose-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-stone-800 truncate">{item.name}</p>
                <p className="text-xs text-stone-500">{item.sku}</p>
              </div>
            </div>

            {/* Last activity */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-stone-500">Last activity</span>
              {item.last_transaction_date ? (
                <div className="flex items-center gap-1.5 text-stone-600">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{formatRelativeTime(item.last_transaction_date)}</span>
                </div>
              ) : (
                <span className="text-stone-400 italic">No transactions</span>
              )}
            </div>

            {/* Action */}
            <Link href={`/admin/items/${item.id}`} className="block">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-rose-600 hover:text-rose-700"
              >
                View Item
                <ExternalLink className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

function LowStockList({ items }: { items: LowStockDetailItem[] }) {
  return (
    <div className="divide-y divide-stone-100">
      {/* Desktop: Table layout */}
      <div className="hidden md:block">
        {/* Header row */}
        <div className="grid grid-cols-12 gap-4 px-6 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide bg-stone-50 border-b border-stone-100">
          <div className="col-span-2">Priority</div>
          <div className="col-span-3">Item</div>
          <div className="col-span-2">Stock Level</div>
          <div className="col-span-1 text-right">Daily</div>
          <div className="col-span-2 text-right">Days Left</div>
          <div className="col-span-2 text-right">Action</div>
        </div>

        {/* Data rows */}
        {items.map((item) => {
          const minStock = item.min_stock ?? 0;
          const percentage = minStock > 0 ? (item.current_stock / minStock) * 100 : 0;

          return (
            <div
              key={item.id}
              className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-stone-50 transition-colors items-center"
            >
              {/* Priority */}
              <div className="col-span-2">
                <PriorityBadge priority={item.priority} />
              </div>

              {/* Item name & SKU */}
              <div className="col-span-3">
                <p className="font-medium text-stone-800">{item.name}</p>
                <p className="text-xs text-stone-500">{item.sku}</p>
              </div>

              {/* Stock level progress */}
              <div className="col-span-2 flex items-center gap-2">
                <Progress
                  value={Math.min(percentage, 100)}
                  colorScheme={
                    item.priority === "critical"
                      ? "error"
                      : item.priority === "urgent"
                      ? "warning"
                      : "success"
                  }
                  size="sm"
                  className="w-16"
                  aria-label={`${percentage.toFixed(0)}% of minimum stock`}
                />
                <span className="text-sm text-stone-600 whitespace-nowrap">
                  {item.current_stock} / {minStock}
                </span>
              </div>

              {/* Daily usage */}
              <div className="col-span-1 text-right">
                <span className="text-sm text-stone-600">
                  {formatDailyUsage(item.daily_consumption_rate)}
                </span>
              </div>

              {/* Days to stockout */}
              <div className="col-span-2 text-right">
                <span
                  className={`text-sm font-medium ${
                    item.days_to_stockout !== null && item.days_to_stockout <= 3
                      ? "text-red-600"
                      : item.days_to_stockout !== null && item.days_to_stockout <= 7
                      ? "text-orange-600"
                      : "text-stone-600"
                  }`}
                >
                  {formatDaysToStockout(item.days_to_stockout)}
                </span>
              </div>

              {/* View Item link */}
              <div className="col-span-2 flex items-center justify-end">
                <Link href={`/admin/items/${item.id}`}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-amber-600 hover:text-amber-700"
                  >
                    View Item
                    <ExternalLink className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile: Card layout */}
      <div className="md:hidden">
        {items.map((item) => {
          const minStock = item.min_stock ?? 0;
          const percentage = minStock > 0 ? (item.current_stock / minStock) * 100 : 0;

          return (
            <div key={item.id} className="p-4 space-y-3 border-b border-stone-100 last:border-b-0">
              {/* Header: Name + Priority */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-stone-800 truncate">{item.name}</p>
                  <p className="text-xs text-stone-500">{item.sku}</p>
                </div>
                <PriorityBadge priority={item.priority} />
              </div>

              {/* Stock level */}
              <div className="flex items-center gap-3">
                <Progress
                  value={Math.min(percentage, 100)}
                  colorScheme={
                    item.priority === "critical"
                      ? "error"
                      : item.priority === "urgent"
                      ? "warning"
                      : "success"
                  }
                  size="sm"
                  className="flex-1"
                  aria-label={`${percentage.toFixed(0)}% of minimum stock`}
                />
                <span className="text-sm text-stone-600 whitespace-nowrap">
                  {item.current_stock} / {minStock}
                </span>
              </div>

              {/* Stats row */}
              <div className="flex items-center justify-between text-sm text-stone-600">
                <span>Daily: {formatDailyUsage(item.daily_consumption_rate)}</span>
                <span
                  className={`font-medium ${
                    item.days_to_stockout !== null && item.days_to_stockout <= 3
                      ? "text-red-600"
                      : item.days_to_stockout !== null && item.days_to_stockout <= 7
                      ? "text-orange-600"
                      : "text-stone-600"
                  }`}
                >
                  {formatDaysToStockout(item.days_to_stockout)} left
                </span>
              </div>

              {/* Action */}
              <Link href={`/admin/items/${item.id}`} className="block">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-amber-600 hover:text-amber-700"
                >
                  View Item
                  <ExternalLink className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
