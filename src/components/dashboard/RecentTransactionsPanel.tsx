"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { ChevronRight, RefreshCw } from "lucide-react";
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Avatar,
  TransactionTypeBadge,
  Skeleton,
  SkeletonText,
} from "@/components/ui";
import { getRecentActivity } from "@/lib/actions/dashboard";
import { formatRelativeTime } from "@/lib/utils";
import { onTransactionSubmitted } from "@/lib/events/transactions";
import { createClient } from "@/lib/supabase/client";

const POLLING_INTERVAL = 60000; // 60 seconds (fallback if realtime unavailable)
const DEBOUNCE_INTERVAL = 2000; // 2 seconds minimum between refreshes

// Transaction type for recent activity
interface RecentTransaction {
  id: string;
  transaction_type: string;
  quantity: number;
  event_timestamp: string;
  item: { name: string; sku: string } | null;
  user: { first_name: string; last_name: string } | null;
}

interface RecentTransactionsPanelProps {
  initialData: RecentTransaction[];
}

export function RecentTransactionsPanel({ initialData }: RecentTransactionsPanelProps) {
  const [transactions, setTransactions] = useState<RecentTransaction[]>(initialData);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const lastRefreshRef = useRef<number>(Date.now());

  const refresh = useCallback(async () => {
    // Debounce: prevent rapid-fire refreshes
    const now = Date.now();
    if (now - lastRefreshRef.current < DEBOUNCE_INTERVAL) {
      return;
    }
    lastRefreshRef.current = now;

    setIsRefreshing(true);
    try {
      const result = await getRecentActivity(5);
      if (result.success && result.data) {
        setTransactions(result.data as RecentTransaction[]);
      }
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Auto-refresh when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refresh();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refresh]);

  // Subscribe to transaction submitted events (same-tab and cross-tab)
  useEffect(() => {
    const unsubscribe = onTransactionSubmitted(() => {
      refresh();
    });
    return unsubscribe;
  }, [refresh]);

  // Subscribe to Supabase Realtime for cross-device transaction updates
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("dashboard-recent-transactions")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "inv_transactions" },
        () => {
          refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  // Light polling as fallback (only when tab is visible)
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        refresh();
      }
    }, POLLING_INTERVAL);

    return () => clearInterval(interval);
  }, [refresh]);

  return (
    <Card variant="elevated" size="md">
      <CardHeader
        title="Recent Transactions"
        subtitle="Latest inventory movements"
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={refresh}
              disabled={isRefreshing}
              aria-label="Refresh transactions"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
            <Link href="/admin/transactions">
              <Button
                variant="ghost"
                size="sm"
                rightIcon={<ChevronRight className="w-4 h-4" />}
              >
                View All
              </Button>
            </Link>
          </div>
        }
        hasBorder
      />
      <CardBody className="p-0">
        <div className="divide-y divide-border">
          {isRefreshing && transactions.length === 0 ? (
            // Loading skeleton
            <div className="divide-y divide-border">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-4">
                    <Skeleton className="w-8 h-8 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="w-32 h-4" />
                      <SkeletonText lines={1} className="w-24" />
                    </div>
                  </div>
                  <Skeleton className="w-16 h-6" />
                </div>
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="px-6 py-8 text-center text-foreground-muted">
              No recent transactions
            </div>
          ) : (
            transactions.map((transaction) => {
              const userName = transaction.user
                ? `${transaction.user.first_name} ${transaction.user.last_name}`
                : "Unknown User";
              const itemName = transaction.item?.name ?? "Unknown Item";
              const transType = transaction.transaction_type;

              return (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between px-6 py-4 hover:bg-neutral-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <Avatar name={userName} size="sm" />
                    <div>
                      <p className="font-medium text-foreground">{itemName}</p>
                      <p className="text-sm text-foreground-muted">
                        {userName} &middot;{" "}
                        {formatRelativeTime(transaction.event_timestamp)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span
                      className={`font-medium ${
                        transType === "check_in" || transType === "return"
                          ? "text-success"
                          : transType === "check_out"
                          ? "text-error"
                          : "text-foreground"
                      }`}
                    >
                      {transType === "check_in" || transType === "return"
                        ? "+"
                        : transType === "check_out"
                        ? "-"
                        : ""}
                      {Math.abs(transaction.quantity)}{" "}
                    </span>
                    <TransactionTypeBadge
                      type={
                        transType as
                          | "check_in"
                          | "check_out"
                          | "adjustment"
                          | "transfer"
                          | "return"
                      }
                      size="sm"
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardBody>
    </Card>
  );
}
