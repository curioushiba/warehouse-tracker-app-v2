"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  ArrowLeftRight,
  ArrowDownToLine,
  ArrowUpFromLine,
  RefreshCw,
  Trash2,
  CornerDownLeft,
  User,
  Package,
  TrendingUp,
} from "lucide-react";
import {
  Button,
  Skeleton,
  SkeletonText,
  Badge,
  Avatar,
} from "@/components/ui";
import {
  getTodayTransactionsBreakdown,
  type TodayTransactionsBreakdown,
} from "@/lib/actions/dashboard";

const transactionTypeConfig: Record<
  string,
  { label: string; icon: typeof ArrowDownToLine; color: string; bgColor: string }
> = {
  check_in: {
    label: "Check In",
    icon: ArrowDownToLine,
    color: "text-emerald-700",
    bgColor: "bg-emerald-100",
  },
  check_out: {
    label: "Check Out",
    icon: ArrowUpFromLine,
    color: "text-rose-700",
    bgColor: "bg-rose-100",
  },
  adjustment: {
    label: "Adjustment",
    icon: RefreshCw,
    color: "text-blue-700",
    bgColor: "bg-blue-100",
  },
  transfer: {
    label: "Transfer",
    icon: ArrowLeftRight,
    color: "text-purple-700",
    bgColor: "bg-purple-100",
  },
  write_off: {
    label: "Write Off",
    icon: Trash2,
    color: "text-stone-700",
    bgColor: "bg-stone-100",
  },
  return: {
    label: "Return",
    icon: CornerDownLeft,
    color: "text-teal-700",
    bgColor: "bg-teal-100",
  },
};

export function TodayTransactionsPanel() {
  const [data, setData] = useState<TodayTransactionsBreakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      const result = await getTodayTransactionsBreakdown();
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="w-32 h-5" />
            {[1, 2, 3].map((j) => (
              <div key={j} className="flex items-center gap-2">
                <Skeleton className="w-8 h-8 rounded" />
                <SkeletonText lines={1} className="flex-1" />
              </div>
            ))}
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

  if (!data || data.totalCount === 0) {
    return (
      <div className="text-center py-8 text-stone-500">
        <ArrowLeftRight className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p className="text-lg font-medium text-stone-700">No transactions today</p>
        <p className="text-sm mt-1">Transactions will appear here as they occur.</p>
        <Link href="/admin/transactions/new" className="inline-block mt-4">
          <Button variant="outline" size="sm" className="text-blue-700 border-blue-300">
            Record Transaction
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Transaction type breakdown */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <ArrowLeftRight className="w-4 h-4 text-blue-600" />
          <h4 className="font-medium text-stone-700">By Type</h4>
        </div>
        <div className="space-y-2">
          {data.typeBreakdown.map((item) => {
            const config = transactionTypeConfig[item.type] ?? {
              label: item.type,
              icon: ArrowLeftRight,
              color: "text-stone-700",
              bgColor: "bg-stone-100",
            };
            const Icon = config.icon;

            return (
              <div
                key={item.type}
                className="flex items-center justify-between p-2 bg-white rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded ${config.bgColor} flex items-center justify-center`}>
                    <Icon className={`w-4 h-4 ${config.color}`} />
                  </div>
                  <span className="text-sm text-stone-700">{config.label}</span>
                </div>
                <Badge colorScheme="neutral" size="sm">
                  {item.count}
                </Badge>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top active items */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-blue-600" />
          <h4 className="font-medium text-stone-700">Most Active Items</h4>
        </div>
        <div className="space-y-2">
          {data.topActiveItems.length === 0 ? (
            <p className="text-sm text-stone-500 italic p-2">No item activity today.</p>
          ) : (
            data.topActiveItems.map((item, index) => (
              <Link
                key={item.id}
                href={`/admin/items/${item.id}`}
                className="flex items-center gap-3 p-2 bg-white rounded-lg hover:bg-stone-50 transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-medium text-blue-700">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-700 truncate">
                    {item.name}
                  </p>
                  <p className="text-xs text-stone-500">{item.sku}</p>
                </div>
                <Badge colorScheme="info" size="sm">
                  {item.transaction_count}
                </Badge>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Employee activity */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <User className="w-4 h-4 text-blue-600" />
          <h4 className="font-medium text-stone-700">Employee Activity</h4>
        </div>
        <div className="space-y-2">
          {data.employeeActivity.length === 0 ? (
            <p className="text-sm text-stone-500 italic p-2">No employee activity today.</p>
          ) : (
            data.employeeActivity.slice(0, 5).map((employee) => (
              <div
                key={employee.id}
                className="flex items-center justify-between p-2 bg-white rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <Avatar name={employee.name} size="sm" />
                  <span className="text-sm text-stone-700 truncate max-w-[120px]">
                    {employee.name}
                  </span>
                </div>
                <Badge colorScheme="neutral" size="sm">
                  {employee.transaction_count}
                </Badge>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
