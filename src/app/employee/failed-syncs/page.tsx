"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  ArrowLeft,
  Package,
  Clock,
} from "lucide-react";
import {
  Card,
  CardBody,
  Button,
  Alert,
} from "@/components/ui";
import { TransactionTypeBadge } from "@/components/ui";
import { useAuthContext } from "@/contexts/AuthContext";
import { getUserSyncErrors, retrySyncError } from "@/lib/actions/sync-errors";
import { formatRelativeTime } from "@/lib/utils";
import type { SyncError } from "@/lib/supabase/types";
import type { TransactionType } from "@/lib/supabase/types";

export default function FailedSyncsPage() {
  const router = useRouter();
  const { user } = useAuthContext();
  const [syncErrors, setSyncErrors] = React.useState<SyncError[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [retryingIds, setRetryingIds] = React.useState<Set<string>>(new Set());
  const [error, setError] = React.useState<string | null>(null);

  // Fetch sync errors
  const fetchErrors = React.useCallback(async () => {
    if (!user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await getUserSyncErrors(user.id);
      if (result.success) {
        setSyncErrors(result.data ?? []);
      } else {
        setError(result.error ?? "Failed to fetch sync errors");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch sync errors");
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  React.useEffect(() => {
    fetchErrors();
  }, [fetchErrors]);

  // Handle retry
  const handleRetry = async (syncErrorId: string) => {
    setRetryingIds((prev) => new Set(prev).add(syncErrorId));

    try {
      const result = await retrySyncError(syncErrorId);
      if (result.success) {
        // Remove from list after successful retry
        setSyncErrors((prev) => prev.filter((e) => e.id !== syncErrorId));
      } else {
        // Update error message if retry failed
        setSyncErrors((prev) =>
          prev.map((e) =>
            e.id === syncErrorId
              ? { ...e, error_message: result.error || e.error_message }
              : e
          )
        );
      }
    } catch (err) {
      console.error("Retry failed:", err);
    } finally {
      setRetryingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(syncErrorId);
        return newSet;
      });
    }
  };

  // Extract transaction details from transaction_data
  const getTransactionDetails = (transactionData: unknown) => {
    const data = transactionData as Record<string, unknown>;
    return {
      type: (data.transaction_type || data.type) as TransactionType | undefined,
      itemName: data.item_name as string | undefined,
      itemId: data.item_id as string | undefined,
      quantity: data.quantity as number | undefined,
    };
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-8 w-28 bg-neutral-200 rounded-lg animate-pulse" />
          <div className="h-8 w-20 bg-neutral-200 rounded-lg animate-pulse" />
        </div>
        <div className="h-12 w-full bg-neutral-200 rounded-lg animate-pulse" />
        {[1, 2, 3].map((i) => (
          <Card key={i} variant="elevated">
            <CardBody className="p-4">
              <div className="flex items-start gap-3 animate-pulse">
                <div className="w-10 h-10 rounded-card bg-neutral-200 flex-shrink-0" />
                <div className="flex-1">
                  <div className="h-4 w-32 bg-neutral-200 rounded mb-2" />
                  <div className="h-3 w-24 bg-neutral-100 rounded mb-3" />
                  <div className="h-8 w-full bg-neutral-100 rounded" />
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Alert status="error" variant="subtle">
          {error}
        </Alert>
        <Button onClick={fetchErrors} leftIcon={<RefreshCw className="w-4 h-4" />}>
          Retry
        </Button>
      </div>
    );
  }

  // All synced - empty state
  if (syncErrors.length === 0) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<ArrowLeft className="w-4 h-4" />}
          onClick={() => router.push("/employee")}
        >
          Back to Home
        </Button>

        <Card variant="elevated">
          <CardBody className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success-light flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-success" />
            </div>
            <h2 className="text-h4 font-heading font-semibold text-foreground mb-2">
              All Synced!
            </h2>
            <p className="text-foreground-muted">
              You have no pending sync errors. All your transactions are up to date.
            </p>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<ArrowLeft className="w-4 h-4" />}
          onClick={() => router.push("/employee")}
        >
          Back
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={fetchErrors}
          leftIcon={<RefreshCw className="w-4 h-4" />}
        >
          Refresh
        </Button>
      </div>

      <Alert status="warning" variant="subtle">
        <span className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {syncErrors.length} transaction{syncErrors.length !== 1 ? "s" : ""} failed to
          sync. Try again or contact your administrator.
        </span>
      </Alert>

      <div className="space-y-3">
        {syncErrors.map((syncError) => {
          const details = getTransactionDetails(syncError.transaction_data);
          const isRetrying = retryingIds.has(syncError.id);

          return (
            <Card key={syncError.id} variant="elevated" className="border-l-4 border-l-error">
              <CardBody className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-card bg-error-light flex items-center justify-center flex-shrink-0">
                    <Package className="w-5 h-5 text-error" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-foreground">
                          {details.itemName || "Unknown Item"}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {details.type && (
                            <TransactionTypeBadge type={details.type} size="xs" />
                          )}
                          {details.quantity && (
                            <span className="text-sm text-foreground-muted">
                              Qty: {details.quantity}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleRetry(syncError.id)}
                        isLoading={isRetrying}
                        leftIcon={<RefreshCw className="w-3 h-3" />}
                      >
                        Retry
                      </Button>
                    </div>

                    <div className="mt-3 p-2 bg-error-light/50 rounded-md">
                      <p className="text-xs text-error-dark">
                        {syncError.error_message}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 mt-2 text-xs text-foreground-muted">
                      <Clock className="w-3 h-3" />
                      <span>{formatRelativeTime(syncError.created_at)}</span>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
