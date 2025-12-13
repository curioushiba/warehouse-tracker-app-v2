"use client";

import * as React from "react";
import { RefreshCw, AlertTriangle, CheckCircle, XCircle, Eye, RotateCcw, X } from "lucide-react";
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Select,
  Skeleton,
  Alert,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Textarea,
  Badge,
} from "@/components/ui";
import { getSyncErrors, retrySyncError, dismissSyncError, getUsers } from "@/lib/actions";
import type { SyncError, SyncErrorStatus, Profile } from "@/lib/supabase/types";

interface TransactionData {
  transaction_type?: string;
  item_id?: string;
  item_name?: string;
  quantity?: number;
  user_id?: string;
  notes?: string;
  device_timestamp?: string;
}

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "resolved", label: "Resolved" },
  { value: "dismissed", label: "Dismissed" },
];

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString("en-SG", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function StatusBadge({ status }: { status: SyncErrorStatus }) {
  const styles: Record<SyncErrorStatus, { colorScheme: "warning" | "success" | "neutral"; icon: React.ReactNode }> = {
    pending: { colorScheme: "warning", icon: <AlertTriangle className="w-3 h-3" /> },
    resolved: { colorScheme: "success", icon: <CheckCircle className="w-3 h-3" /> },
    dismissed: { colorScheme: "neutral", icon: <XCircle className="w-3 h-3" /> },
  };

  const { colorScheme, icon } = styles[status];

  return (
    <Badge colorScheme={colorScheme} className="inline-flex items-center gap-1">
      {icon}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

export default function SyncErrorsPage() {
  // Data state
  const [syncErrors, setSyncErrors] = React.useState<SyncError[]>([]);
  const [users, setUsers] = React.useState<Profile[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = React.useState<string>("");

  // Modal state
  const [selectedError, setSelectedError] = React.useState<SyncError | null>(null);
  const [showDetailModal, setShowDetailModal] = React.useState(false);
  const [showDismissModal, setShowDismissModal] = React.useState(false);
  const [dismissNotes, setDismissNotes] = React.useState("");
  const [isProcessing, setIsProcessing] = React.useState(false);

  // Fetch data
  const fetchData = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [errorsResult, usersResult] = await Promise.all([
        getSyncErrors({
          status: statusFilter as SyncErrorStatus | undefined,
        }),
        getUsers(),
      ]);

      if (errorsResult.success) {
        setSyncErrors(errorsResult.data || []);
      } else {
        setError(errorsResult.error || "Failed to load sync errors");
      }

      if (usersResult.success) {
        setUsers(usersResult.data);
      }
    } catch (err) {
      setError("Failed to load sync errors");
      console.error("Error fetching sync errors:", err);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Get user name helper
  const getUserName = (userId: string | null): string => {
    if (!userId) return "Unknown";
    const user = users.find((u) => u.id === userId);
    if (!user) return "Unknown";
    return user.first_name && user.last_name
      ? `${user.first_name} ${user.last_name}`
      : user.username;
  };

  // Handle retry
  const handleRetry = async (syncError: SyncError) => {
    setIsProcessing(true);
    try {
      const result = await retrySyncError(syncError.id);
      if (result.success) {
        await fetchData();
      } else {
        setError(result.error || "Failed to retry sync error");
      }
    } catch (err) {
      setError("Failed to retry sync error");
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle dismiss
  const handleDismiss = async () => {
    if (!selectedError) return;

    setIsProcessing(true);
    try {
      const result = await dismissSyncError(selectedError.id, dismissNotes);
      if (result.success) {
        setShowDismissModal(false);
        setSelectedError(null);
        setDismissNotes("");
        await fetchData();
      } else {
        setError(result.error || "Failed to dismiss sync error");
      }
    } catch (err) {
      setError("Failed to dismiss sync error");
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Open detail modal
  const openDetailModal = (syncError: SyncError) => {
    setSelectedError(syncError);
    setShowDetailModal(true);
  };

  // Open dismiss modal
  const openDismissModal = (syncError: SyncError) => {
    setSelectedError(syncError);
    setDismissNotes("");
    setShowDismissModal(true);
  };

  // Parse transaction data
  const getTransactionData = (syncError: SyncError): TransactionData => {
    try {
      return syncError.transaction_data as TransactionData;
    } catch {
      return {};
    }
  };

  // Count stats
  const pendingCount = syncErrors.filter((e) => e.status === "pending").length;
  const resolvedCount = syncErrors.filter((e) => e.status === "resolved").length;
  const dismissedCount = syncErrors.filter((e) => e.status === "dismissed").length;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Card variant="elevated">
          <CardBody className="p-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">
            Sync Errors
          </h1>
          <p className="text-foreground-muted text-sm">
            Manage failed offline transaction syncs
          </p>
        </div>
        <Button
          variant="outline"
          leftIcon={<RefreshCw className="w-4 h-4" />}
          onClick={fetchData}
          disabled={isLoading}
        >
          Refresh
        </Button>
      </div>

      {error && (
        <Alert status="error" variant="subtle">
          {error}
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card variant="elevated">
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <AlertTriangle className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{pendingCount}</p>
                <p className="text-sm text-foreground-muted">Pending</p>
              </div>
            </div>
          </CardBody>
        </Card>
        <Card variant="elevated">
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <CheckCircle className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{resolvedCount}</p>
                <p className="text-sm text-foreground-muted">Resolved</p>
              </div>
            </div>
          </CardBody>
        </Card>
        <Card variant="elevated">
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary/10">
                <XCircle className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{dismissedCount}</p>
                <p className="text-sm text-foreground-muted">Dismissed</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Filters */}
      <Card variant="elevated">
        <CardBody className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="w-full sm:w-48">
              <Select
                options={STATUS_OPTIONS}
                value={statusFilter}
                onChange={(value) => setStatusFilter(value)}
                placeholder="Filter by status"
              />
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Errors Table */}
      <Card variant="elevated">
        <CardHeader className="p-6 pb-0">
          <h3 className="font-semibold text-foreground">
            Sync Errors ({syncErrors.length})
          </h3>
        </CardHeader>
        <CardBody className="p-0">
          {syncErrors.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle className="w-12 h-12 text-success mx-auto mb-4" />
              <p className="text-foreground-muted">No sync errors found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-4 text-sm font-medium text-foreground-muted">
                      Status
                    </th>
                    <th className="text-left p-4 text-sm font-medium text-foreground-muted">
                      Error
                    </th>
                    <th className="text-left p-4 text-sm font-medium text-foreground-muted">
                      User
                    </th>
                    <th className="text-left p-4 text-sm font-medium text-foreground-muted">
                      Created
                    </th>
                    <th className="text-right p-4 text-sm font-medium text-foreground-muted">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {syncErrors.map((syncError) => {
                    const txData = getTransactionData(syncError);
                    return (
                      <tr
                        key={syncError.id}
                        className="border-b border-border hover:bg-background-subtle transition-colors"
                      >
                        <td className="p-4">
                          <StatusBadge status={syncError.status} />
                        </td>
                        <td className="p-4">
                          <div className="max-w-xs">
                            <p className="text-sm font-medium text-foreground truncate">
                              {syncError.error_message}
                            </p>
                            {txData.transaction_type && (
                              <p className="text-xs text-foreground-muted">
                                {txData.transaction_type.replace("_", " ")} - Qty: {txData.quantity}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-sm text-foreground">
                            {getUserName(syncError.user_id)}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="text-sm text-foreground-muted">
                            {formatDate(syncError.created_at)}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDetailModal(syncError)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {syncError.status === "pending" && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRetry(syncError)}
                                  disabled={isProcessing}
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openDismissModal(syncError)}
                                  disabled={isProcessing}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedError(null);
        }}
        size="lg"
      >
        <ModalHeader>
          <h2 className="text-lg font-semibold">Sync Error Details</h2>
        </ModalHeader>
        <ModalBody className="space-y-4">
          {selectedError && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-foreground-muted">Status</p>
                  <StatusBadge status={selectedError.status} />
                </div>
                <div>
                  <p className="text-sm text-foreground-muted">User</p>
                  <p className="text-sm font-medium">
                    {getUserName(selectedError.user_id)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-foreground-muted">Created</p>
                  <p className="text-sm font-medium">
                    {formatDate(selectedError.created_at)}
                  </p>
                </div>
                {selectedError.resolved_at && (
                  <div>
                    <p className="text-sm text-foreground-muted">Resolved</p>
                    <p className="text-sm font-medium">
                      {formatDate(selectedError.resolved_at)}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm text-foreground-muted mb-1">Error Message</p>
                <div className="p-3 bg-error/10 rounded-lg border border-error/20">
                  <p className="text-sm text-error">{selectedError.error_message}</p>
                </div>
              </div>

              {selectedError.resolution_notes && (
                <div>
                  <p className="text-sm text-foreground-muted mb-1">Resolution Notes</p>
                  <p className="text-sm">{selectedError.resolution_notes}</p>
                </div>
              )}

              <div>
                <p className="text-sm text-foreground-muted mb-1">Transaction Data</p>
                <pre className="p-3 bg-background-subtle rounded-lg text-xs overflow-auto max-h-64">
                  {JSON.stringify(selectedError.transaction_data, null, 2)}
                </pre>
              </div>
            </>
          )}
        </ModalBody>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => {
              setShowDetailModal(false);
              setSelectedError(null);
            }}
          >
            Close
          </Button>
          {selectedError?.status === "pending" && (
            <>
              <Button
                variant="outline"
                leftIcon={<RotateCcw className="w-4 h-4" />}
                onClick={() => {
                  setShowDetailModal(false);
                  handleRetry(selectedError);
                }}
                disabled={isProcessing}
              >
                Retry
              </Button>
              <Button
                variant="danger"
                leftIcon={<X className="w-4 h-4" />}
                onClick={() => {
                  setShowDetailModal(false);
                  openDismissModal(selectedError);
                }}
                disabled={isProcessing}
              >
                Dismiss
              </Button>
            </>
          )}
        </ModalFooter>
      </Modal>

      {/* Dismiss Modal */}
      <Modal
        isOpen={showDismissModal}
        onClose={() => {
          setShowDismissModal(false);
          setSelectedError(null);
          setDismissNotes("");
        }}
      >
        <ModalHeader>
          <h2 className="text-lg font-semibold">Dismiss Sync Error</h2>
        </ModalHeader>
        <ModalBody className="space-y-4">
          <p className="text-sm text-foreground-muted">
            Are you sure you want to dismiss this sync error? The transaction will not be processed.
          </p>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Resolution Notes (Optional)
            </label>
            <Textarea
              value={dismissNotes}
              onChange={(e) => setDismissNotes(e.target.value)}
              placeholder="Add notes about why this error was dismissed..."
              rows={3}
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => {
              setShowDismissModal(false);
              setSelectedError(null);
              setDismissNotes("");
            }}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDismiss}
            isLoading={isProcessing}
            disabled={isProcessing}
          >
            Dismiss Error
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
