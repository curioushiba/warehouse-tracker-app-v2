"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plus,
  Minus,
  QrCode,
  Package,
  Clock,
  ChevronRight,
  TrendingUp,
  PenLine,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import {
  Card,
  CardBody,
  Button,
  Avatar,
  Modal,
  ModalHeader,
  ModalBody,
} from "@/components/ui";
import {
  TransactionTypeBadge,
  SyncStatusIndicator,
} from "@/components/ui";
import { formatRelativeTime } from "@/lib/utils";
import { useAuthContext } from "@/contexts/AuthContext";
import { useSyncQueue } from "@/hooks/useSyncQueue";
import { useSyncErrorCount } from "@/hooks/useSyncErrorCount";
import {
  getCmEmployeeTransactionsWithItems,
  type EmployeeTransactionWithItem,
} from "@/lib/actions/commissary-transactions";

type TransactionType = "check_in" | "check_out";

function getDisplayName(
  profile: { name?: string | null; first_name?: string | null; last_name?: string | null; username?: string | null } | null,
  user: { email?: string | null } | null
): string {
  if (profile) {
    if (profile.name && profile.name.trim()) return profile.name.trim();
    if (profile.first_name && profile.last_name) return `${profile.first_name.trim()} ${profile.last_name.trim()}`;
    if (profile.first_name && profile.first_name.trim()) return profile.first_name.trim();
    if (profile.last_name && profile.last_name.trim()) return profile.last_name.trim();
    if (profile.username && profile.username.trim()) return profile.username.trim();
  }
  if (user?.email) return user.email.split('@')[0];
  return "User";
}

export default function CommissaryHomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile, user, isLoading: authLoading } = useAuthContext();
  const { queueCount, isSyncing, syncQueue, isOnline, lastSyncTime } = useSyncQueue();
  const { failedSyncCount } = useSyncErrorCount();

  const [showBatchSuccess, setShowBatchSuccess] = React.useState(false);
  const [batchSuccessCount, setBatchSuccessCount] = React.useState(0);

  React.useEffect(() => {
    const batchSuccess = searchParams.get("batchSuccess");
    if (batchSuccess) {
      const count = parseInt(batchSuccess, 10);
      if (!isNaN(count) && count > 0) {
        setBatchSuccessCount(count);
        setShowBatchSuccess(true);
        router.replace("/PWA/commissarypwa", { scroll: false });
        const timer = setTimeout(() => setShowBatchSuccess(false), 5000);
        return () => clearTimeout(timer);
      }
    }
  }, [searchParams, router]);

  React.useEffect(() => {
    router.prefetch("/PWA/commissarypwa/scan");
    router.prefetch("/PWA/commissarypwa/history");
  }, [router]);

  const [recentTransactions, setRecentTransactions] = React.useState<EmployeeTransactionWithItem[]>([]);
  const [todayTransactionsCount, setTodayTransactionsCount] = React.useState(0);
  const [isLoadingData, setIsLoadingData] = React.useState(true);

  const [modalOpen, setModalOpen] = React.useState(false);
  const [selectedAction, setSelectedAction] = React.useState<TransactionType | null>(null);

  React.useEffect(() => {
    async function fetchData() {
      if (!user?.id) {
        setIsLoadingData(false);
        return;
      }

      setIsLoadingData(true);

      try {
        const [recentResult, todayResult] = await Promise.all([
          getCmEmployeeTransactionsWithItems(user.id, { limit: 3 }),
          getCmEmployeeTransactionsWithItems(user.id, { todayOnly: true }),
        ]);

        if (recentResult.success) {
          setRecentTransactions(recentResult.data);
        } else {
          setRecentTransactions([]);
        }

        if (todayResult.success) {
          setTodayTransactionsCount(todayResult.data.length);
        } else {
          setTodayTransactionsCount(0);
        }
      } catch (error) {
        console.error('[CommissaryPage] Exception fetching data:', error);
        setRecentTransactions([]);
        setTodayTransactionsCount(0);
      } finally {
        setIsLoadingData(false);
      }
    }

    fetchData();
  }, [user?.id, lastSyncTime]);

  const handleActionClick = (action: TransactionType) => {
    setSelectedAction(action);
    setModalOpen(true);
  };

  const handleMethodSelect = (method: "scan" | "manual") => {
    setModalOpen(false);
    if (method === "scan") {
      router.push(`/PWA/commissarypwa/scan?type=${selectedAction}`);
    } else {
      router.push(`/PWA/commissarypwa/scan?type=${selectedAction}&mode=manual`);
    }
  };

  const handleSyncNow = async () => {
    if (isOnline && queueCount > 0) {
      await syncQueue();
    }
  };

  const displayName = getDisplayName(profile, user);
  const isNameLoading = authLoading;
  const isLoading = authLoading || isLoadingData;

  return (
    <div className="space-y-6">
      {/* Batch Success Toast */}
      {showBatchSuccess && (
        <div className="bg-success-light border border-success/30 rounded-card p-4 flex items-center gap-3 animate-fade-in">
          <div className="w-10 h-10 bg-success/20 rounded-full flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-5 h-5 text-success" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-success-dark">
              Batch submitted successfully!
            </p>
            <p className="text-sm text-success-dark/70">
              {batchSuccessCount} item{batchSuccessCount !== 1 ? "s" : ""} checked {batchSuccessCount > 0 ? "in/out" : ""}.
            </p>
          </div>
          <button
            onClick={() => setShowBatchSuccess(false)}
            className="text-success-dark/50 hover:text-success-dark p-1"
            aria-label="Dismiss"
          >
            &times;
          </button>
        </div>
      )}

      {/* Welcome Section - Warm orange commissary branding */}
      <div className="bg-gradient-to-br from-[#E07A2F] to-[#C45A1A] rounded-card p-6 text-white">
        <div className="flex items-center gap-4 mb-4">
          {isNameLoading ? (
            <div className="w-12 h-12 rounded-full bg-white/20 animate-pulse" />
          ) : (
            <Avatar
              name={displayName}
              size="lg"
              className="border-2 border-white/30"
            />
          )}
          <div>
            <p className="text-white/80 text-sm">Welcome back,</p>
            {isNameLoading ? (
              <div className="h-6 w-32 bg-white/20 rounded animate-pulse mt-1" />
            ) : (
              <h2 className="text-xl font-heading font-semibold">
                {displayName}
              </h2>
            )}
          </div>
        </div>
        <div className={`grid ${failedSyncCount > 0 ? 'grid-cols-3' : 'grid-cols-2'} gap-3`}>
          <div className="bg-white/10 rounded-card p-3">
            <p className="text-white/70 text-xs mb-1">Today&apos;s Transactions</p>
            {isLoading ? (
              <div className="h-8 w-12 bg-white/20 rounded animate-pulse" />
            ) : (
              <p className="text-h3 font-bold">{todayTransactionsCount}</p>
            )}
          </div>
          <div className="bg-white/10 rounded-card p-3">
            <p className="text-white/70 text-xs mb-1">Pending Sync</p>
            <div className="flex items-center gap-2">
              <p className="text-h3 font-bold">{queueCount}</p>
              {queueCount > 0 && (
                <SyncStatusIndicator status="pending" size="sm" />
              )}
            </div>
          </div>
          {failedSyncCount > 0 && (
            <Link href="/PWA/commissarypwa/profile" className="bg-error/20 rounded-card p-3 hover:bg-error/30 transition-colors">
              <p className="text-white/70 text-xs mb-1">Failed Syncs</p>
              <div className="flex items-center gap-2">
                <p className="text-h3 font-bold">{failedSyncCount}</p>
                <AlertCircle className="w-4 h-4 text-white" />
              </div>
            </Link>
          )}
        </div>
      </div>

      {/* Hero Action Buttons */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => handleActionClick("check_in")}
          className="group relative h-40 bg-success-light border-2 border-success/30 rounded-card shadow-md hover:shadow-xl hover:border-success transition-all duration-200 hover:-translate-y-1 active:translate-y-0 active:shadow-md focus:outline-none focus:ring-2 focus:ring-success/40 focus:ring-offset-2"
        >
          <div className="h-full flex flex-col items-center justify-center p-4">
            <div className="w-18 h-18 rounded-full bg-white border-[3px] border-success flex items-center justify-center mb-3 shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all duration-200">
              <Plus className="w-9 h-9 text-success stroke-[2.5]" />
            </div>
            <span className="text-h4 font-heading font-bold text-success-dark tracking-wide">IN</span>
            <span className="text-xs text-success-dark/70 mt-0.5 font-medium">Add Stock</span>
          </div>
          <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-success opacity-60" />
        </button>

        <button
          onClick={() => handleActionClick("check_out")}
          className="group relative h-40 bg-error-light border-2 border-error/30 rounded-card shadow-md hover:shadow-xl hover:border-error transition-all duration-200 hover:-translate-y-1 active:translate-y-0 active:shadow-md focus:outline-none focus:ring-2 focus:ring-error/40 focus:ring-offset-2"
        >
          <div className="h-full flex flex-col items-center justify-center p-4">
            <div className="w-18 h-18 rounded-full bg-white border-[3px] border-error flex items-center justify-center mb-3 shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all duration-200">
              <Minus className="w-9 h-9 text-error stroke-[2.5]" />
            </div>
            <span className="text-h4 font-heading font-bold text-error-dark tracking-wide">OUT</span>
            <span className="text-xs text-error-dark/70 mt-0.5 font-medium">Remove Stock</span>
          </div>
          <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-error opacity-60" />
        </button>
      </div>

      {/* Action Method Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} size="sm">
        <ModalHeader onClose={() => setModalOpen(false)}>
          {selectedAction === "check_in" ? "Check In" : "Check Out"}
        </ModalHeader>
        <ModalBody className="pb-8">
          <p className="text-foreground-muted text-sm mb-5 text-center">
            How would you like to {selectedAction === "check_in" ? "add" : "remove"} items?
          </p>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleMethodSelect("scan")}
              className="group flex flex-col items-center p-5 rounded-card border-2 border-border hover:border-[#E07A2F] hover:bg-[#E07A2F]/5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#E07A2F]/30"
            >
              <div className="w-14 h-14 rounded-full bg-[#E07A2F]/10 flex items-center justify-center mb-3 group-hover:bg-[#E07A2F]/20 transition-colors duration-200">
                <QrCode className="w-7 h-7 text-[#E07A2F]" />
              </div>
              <span className="font-semibold text-foreground">Scan</span>
              <span className="text-xs text-foreground-muted text-center mt-1">
                Use camera
              </span>
            </button>

            <button
              onClick={() => handleMethodSelect("manual")}
              className="group flex flex-col items-center p-5 rounded-card border-2 border-border hover:border-[#E07A2F] hover:bg-[#E07A2F]/5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#E07A2F]/30"
            >
              <div className="w-14 h-14 rounded-full bg-[#E07A2F]/10 flex items-center justify-center mb-3 group-hover:bg-[#E07A2F]/20 transition-colors duration-200">
                <PenLine className="w-7 h-7 text-[#E07A2F]" />
              </div>
              <span className="font-semibold text-foreground">Manual</span>
              <span className="text-xs text-foreground-muted text-center mt-1">
                Enter details
              </span>
            </button>
          </div>
        </ModalBody>
      </Modal>

      {/* Recent Activity */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground-muted uppercase tracking-wider">
            Recent Activity
          </h3>
          <Link
            href="/PWA/commissarypwa/history"
            className="text-sm text-[#E07A2F] font-medium flex items-center gap-1"
          >
            View All
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <Card variant="elevated">
          <CardBody className="p-0 divide-y divide-border">
            {isLoadingData ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-card bg-neutral-200" />
                    <div>
                      <div className="h-4 w-24 bg-neutral-200 rounded mb-2" />
                      <div className="h-3 w-16 bg-neutral-100 rounded" />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="h-4 w-8 bg-neutral-200 rounded mb-2" />
                    <div className="h-4 w-16 bg-neutral-100 rounded" />
                  </div>
                </div>
              ))
            ) : recentTransactions.length === 0 ? (
              <div className="p-8 text-center">
                <Package className="w-10 h-10 mx-auto text-foreground-muted mb-3" />
                <p className="text-foreground-muted text-sm">No transactions yet</p>
                <p className="text-foreground-placeholder text-xs mt-1">
                  Start by checking commissary items in or out
                </p>
              </div>
            ) : (
              recentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-card flex items-center justify-center ${
                        transaction.transaction_type === "check_in" ||
                        transaction.transaction_type === "return"
                          ? "bg-success-light"
                          : transaction.transaction_type === "check_out"
                          ? "bg-error-light"
                          : "bg-neutral-100"
                      }`}
                    >
                      {transaction.transaction_type === "check_in" ||
                      transaction.transaction_type === "return" ? (
                        <TrendingUp className="w-5 h-5 text-success" />
                      ) : (
                        <Package className="w-5 h-5 text-error" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-sm">
                        {transaction.item?.name || 'Unknown Item'}
                      </p>
                      <p className="text-xs text-foreground-muted">
                        {formatRelativeTime(transaction.server_timestamp)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-semibold text-sm ${
                        transaction.transaction_type === "check_in" ||
                        transaction.transaction_type === "return"
                          ? "text-success"
                          : "text-error"
                      }`}
                    >
                      {transaction.transaction_type === "check_in" ||
                      transaction.transaction_type === "return"
                        ? "+"
                        : "-"}
                      {transaction.quantity}
                    </p>
                    <TransactionTypeBadge type={transaction.transaction_type} size="xs" />
                  </div>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>

      {/* Sync Status */}
      {queueCount > 0 && (
        <Card variant="filled" className="bg-warning-light border-warning/20">
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-warning/20 rounded-card flex items-center justify-center">
                <Clock className="w-5 h-5 text-warning-dark" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">
                  {queueCount} transaction{queueCount !== 1 ? 's' : ''} pending sync
                </p>
                <p className="text-xs text-foreground-muted">
                  {isOnline ? "Will sync automatically" : "Will sync when online"}
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSyncNow}
                isLoading={isSyncing}
                disabled={!isOnline}
                leftIcon={<RefreshCw className="w-4 h-4" />}
              >
                Sync Now
              </Button>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
