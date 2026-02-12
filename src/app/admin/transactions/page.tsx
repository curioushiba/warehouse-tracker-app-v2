"use client";

import * as React from "react";
import {
  Download,
  Package,
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowRightLeft,
  Wrench,
  Trash2,
  RotateCcw,
  Calendar,
  RefreshCw,
  User,
  MapPin,
  Clock,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  AlertCircle,
} from "lucide-react";
import {
  Card,
  Button,
  IconButton,
  SearchInput,
  Select,
  Input,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Skeleton,
  SkeletonTableRow,
  Alert,
  Badge,
  LoadingOverlay,
  Tooltip,
  TransactionTypeBadge,
  SyncStatusIndicator,
} from "@/components/ui";
import {
  getTransactionsWithDetailsPaginated,
  type PaginatedTransactionFilters,
  type TransactionWithDetails,
} from "@/lib/actions/transactions";
import { getUsers } from "@/lib/actions/users";
import type { Profile, TransactionType, SyncStatus } from "@/lib/supabase/types";
import type { BadgeColorScheme } from "@/types";
import { formatDateTime } from "@/lib/utils";

const TRANSACTION_TYPE_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "check_in", label: "Check In" },
  { value: "check_out", label: "Check Out" },
  { value: "transfer", label: "Transfer" },
  { value: "adjustment", label: "Adjustment" },
  { value: "write_off", label: "Write Off" },
  { value: "return", label: "Return" },
];

function getTransactionIcon(type: TransactionType): React.ReactNode {
  switch (type) {
    case "check_in":
      return <ArrowDownCircle className="w-4 h-4 text-success" />;
    case "check_out":
      return <ArrowUpCircle className="w-4 h-4 text-warning" />;
    case "transfer":
      return <ArrowRightLeft className="w-4 h-4 text-primary" />;
    case "adjustment":
      return <Wrench className="w-4 h-4 text-info" />;
    case "write_off":
      return <Trash2 className="w-4 h-4 text-error" />;
    case "return":
      return <RotateCcw className="w-4 h-4 text-success" />;
    default:
      return <Package className="w-4 h-4 text-foreground-muted" />;
  }
}

const INCREASE_TYPES = new Set<TransactionType>(["check_in", "return"]);
const DECREASE_TYPES = new Set<TransactionType>(["check_out", "write_off"]);

function getQuantityDisplay(type: TransactionType): { sign: string; colorClass: string } {
  if (INCREASE_TYPES.has(type)) return { sign: "+", colorClass: "text-success" };
  if (DECREASE_TYPES.has(type)) return { sign: "-", colorClass: "text-error" };
  return { sign: "", colorClass: "" };
}

const TYPE_SUMMARY_CONFIG: { key: string; colorScheme: BadgeColorScheme }[] = [
  { key: "check_in", colorScheme: "success" },
  { key: "check_out", colorScheme: "warning" },
  { key: "adjustment", colorScheme: "info" },
  { key: "transfer", colorScheme: "primary" },
  { key: "write_off", colorScheme: "error" },
  { key: "return", colorScheme: "success" },
];

function getPageNumbers(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "ellipsis")[] = [1];
  if (current > 3) pages.push("ellipsis");
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2) pages.push("ellipsis");
  pages.push(total);
  return pages;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = React.useState<TransactionWithDetails[]>([]);
  const [users, setUsers] = React.useState<Profile[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isInitialLoad, setIsInitialLoad] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [totalCount, setTotalCount] = React.useState(0);
  const [totalPages, setTotalPages] = React.useState(0);

  const [searchQuery, setSearchQuery] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("");
  const [userFilter, setUserFilter] = React.useState("");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");

  const [sortConfig, setSortConfig] = React.useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);

  const [selectedTransaction, setSelectedTransaction] = React.useState<TransactionWithDetails | null>(null);
  const [detailModalOpen, setDetailModalOpen] = React.useState(false);

  const userMap = React.useMemo(
    () => new Map(users.map((user) => [user.id, user])),
    [users]
  );

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [typeFilter, userFilter, startDate, endDate]);

  const fetchData = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const filters: PaginatedTransactionFilters = {
        page: currentPage,
        pageSize,
        search: debouncedSearch || undefined,
        transactionType: (typeFilter as TransactionType) || undefined,
        userId: userFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      };

      const [transactionsResult, usersResult] = await Promise.all([
        getTransactionsWithDetailsPaginated(filters),
        getUsers(),
      ]);

      if (transactionsResult.success) {
        setTransactions(transactionsResult.data.data);
        setTotalCount(transactionsResult.data.totalCount);
        setTotalPages(transactionsResult.data.totalPages);
      } else {
        setError(transactionsResult.error || "Failed to load transactions");
        return;
      }

      if (usersResult.success) {
        setUsers(usersResult.data);
      }
    } catch (err) {
      setError("An unexpected error occurred");
      console.error("Error fetching data:", err);
    } finally {
      setIsLoading(false);
      setIsInitialLoad(false);
    }
  }, [currentPage, pageSize, debouncedSearch, typeFilter, userFilter, startDate, endDate]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const handleSort = (key: string) => {
    setSortConfig((current) => {
      if (current?.key === key) {
        return current.direction === "asc"
          ? { key, direction: "desc" }
          : null;
      }
      return { key, direction: "asc" };
    });
  };

  const getUserName = React.useCallback(
    (userId: string, embeddedUser?: TransactionWithDetails["user"]): string => {
      const user = embeddedUser ?? userMap.get(userId) ?? null;
      if (!user) return "Unknown";
      if (user.first_name && user.last_name) return `${user.first_name} ${user.last_name}`;
      return user.email || "Unknown";
    },
    [userMap]
  );

  const sortedTransactions = React.useMemo(() => {
    if (!sortConfig) return transactions;

    const result = [...transactions];
    result.sort((a, b) => {
      let aValue: string | number | null = null;
      let bValue: string | number | null = null;

      switch (sortConfig.key) {
        case "event_timestamp":
          aValue = a.event_timestamp;
          bValue = b.event_timestamp;
          break;
        case "transaction_type":
          aValue = a.transaction_type;
          bValue = b.transaction_type;
          break;
        case "item":
          aValue = (a.item?.name || "").toLowerCase();
          bValue = (b.item?.name || "").toLowerCase();
          break;
        case "quantity":
          aValue = a.quantity;
          bValue = b.quantity;
          break;
        case "user":
          aValue = getUserName(a.user_id, a.user).toLowerCase();
          bValue = getUserName(b.user_id, b.user).toLowerCase();
          break;
        default:
          return 0;
      }

      if (aValue === null || bValue === null) return 0;
      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [transactions, sortConfig, getUserName]);

  const typeSummary = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const tx of transactions) {
      counts[tx.transaction_type] = (counts[tx.transaction_type] || 0) + 1;
    }
    return counts;
  }, [transactions]);

  const handleRowClick = (transaction: TransactionWithDetails) => {
    setSelectedTransaction(transaction);
    setDetailModalOpen(true);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setTypeFilter("");
    setUserFilter("");
    setStartDate("");
    setEndDate("");
  };

  const hasActiveFilters = debouncedSearch || typeFilter || userFilter || startDate || endDate;

  const handleExport = () => {
    const headers = ["Date", "Type", "Item", "Quantity", "Stock Before", "Stock After", "User", "Notes", "Status"];
    const rows = sortedTransactions.map((tx) => [
      formatDateTime(tx.event_timestamp),
      tx.transaction_type,
      tx.item?.name || "Unknown Item",
      tx.quantity.toString(),
      tx.stock_before?.toString() || "",
      tx.stock_after?.toString() || "",
      getUserName(tx.user_id, tx.user),
      tx.notes || "",
      tx.sync_status,
    ]);

    const csv = [headers.join(","), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Full-page error state
  if (error && transactions.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="w-12 h-12 text-error mb-4" />
        <h2 className="text-xl font-semibold mb-2">Failed to Load Transactions</h2>
        <p className="text-foreground-muted mb-4">{error}</p>
        <Button onClick={fetchData} leftIcon={<RefreshCw className="w-4 h-4" />}>
          Try Again
        </Button>
      </div>
    );
  }

  // Initial load skeleton
  if (isLoading && isInitialLoad) {
    return (
      <div className="space-y-6">
        {/* Summary bar skeleton */}
        <Skeleton className="h-10 w-full" borderRadius="lg" />
        {/* Search + filters skeleton */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <Skeleton className="h-10 flex-1" />
            <div className="flex gap-2 flex-shrink-0">
              <Skeleton className="h-10 w-40" />
              <Skeleton className="h-10 w-40" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-36" />
            <Skeleton className="h-4 w-6" />
            <Skeleton className="h-8 w-36" />
          </div>
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-48" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-8" />
            </div>
          </div>
        </div>
        {/* Table skeleton */}
        <Card variant="elevated" className="overflow-hidden">
          <Table variant="simple" size="md">
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Before</TableHead>
                <TableHead>After</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(10)].map((_, i) => (
                <SkeletonTableRow key={i} columns={8} />
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Alert (when data exists but error occurred) */}
      {error && transactions.length > 0 && (
        <Alert status="error" variant="subtle" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Summary Bar */}
      {transactions.length > 0 && (
        <Card variant="filled" size="sm">
          <div className="flex items-center gap-4 text-sm flex-wrap">
            <span><strong>{totalCount}</strong> total transactions</span>
            {TYPE_SUMMARY_CONFIG.map(({ key, colorScheme }) =>
              typeSummary[key] > 0 ? (
                <Badge key={key} colorScheme={colorScheme} variant="subtle" size="xs">
                  {typeSummary[key]} {key.replace("_", " ")}
                </Badge>
              ) : null
            )}
          </div>
        </Card>
      )}

      {/* Actions Bar */}
      <div className="space-y-3">
        {/* Row 1: Search + Filter Dropdowns */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <SearchInput
              placeholder="Search by item, user, notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClear={() => setSearchQuery("")}
            />
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Select
              options={TRANSACTION_TYPE_OPTIONS}
              value={typeFilter}
              onChange={(value) => setTypeFilter(value)}
              className="w-40"
            />
            <Select
              options={[
                { value: "", label: "All Users" },
                ...users.map((u) => ({
                  value: u.id,
                  label: u.first_name && u.last_name
                    ? `${u.first_name} ${u.last_name}`
                    : u.email || u.id,
                })),
              ]}
              value={userFilter}
              onChange={(value) => setUserFilter(value)}
              className="w-40"
            />
          </div>
        </div>

        {/* Date Range Row */}
        <div className="flex flex-wrap items-center gap-2">
          <Calendar className="w-4 h-4 text-foreground-muted" />
          <Input
            type="date"
            size="sm"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-36"
          />
          <span className="text-foreground-muted text-sm">to</span>
          <Input
            type="date"
            size="sm"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-36"
          />
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<X className="w-4 h-4" />}
              onClick={clearFilters}
            >
              Clear Filters
            </Button>
          )}
        </div>

        {/* Row 2: Result Count + Action Buttons */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-foreground-muted">
            Showing {totalCount === 0 ? 0 : ((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, totalCount)} of {totalCount} transactions
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Download className="w-4 h-4" />}
              onClick={handleExport}
              disabled={isLoading || sortedTransactions.length === 0}
            >
              Export
            </Button>
            <Tooltip content="Refresh" placement="top">
              <IconButton
                icon={<RefreshCw className="w-4 h-4" />}
                aria-label="Refresh transactions"
                variant="ghost"
                size="sm"
                onClick={fetchData}
                disabled={isLoading}
              />
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <Card variant="elevated" className="overflow-hidden relative">
        <LoadingOverlay isLoading={isLoading && !isInitialLoad} label="Updating transactions..." />
        <Table variant="simple" size="md">
          <TableHeader>
            <TableRow>
              <TableHead
                sortable
                sortDirection={sortConfig?.key === "event_timestamp" ? sortConfig.direction : null}
                onSort={() => handleSort("event_timestamp")}
              >
                Date & Time
              </TableHead>
              <TableHead
                sortable
                sortDirection={sortConfig?.key === "transaction_type" ? sortConfig.direction : null}
                onSort={() => handleSort("transaction_type")}
              >
                Type
              </TableHead>
              <TableHead
                sortable
                sortDirection={sortConfig?.key === "item" ? sortConfig.direction : null}
                onSort={() => handleSort("item")}
              >
                Item
              </TableHead>
              <TableHead
                className="text-right"
                sortable
                sortDirection={sortConfig?.key === "quantity" ? sortConfig.direction : null}
                onSort={() => handleSort("quantity")}
              >
                Qty
              </TableHead>
              <TableHead className="text-right">Before</TableHead>
              <TableHead className="text-right">After</TableHead>
              <TableHead
                sortable
                sortDirection={sortConfig?.key === "user" ? sortConfig.direction : null}
                onSort={() => handleSort("user")}
              >
                User
              </TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTransactions.length === 0 ? (
              hasActiveFilters ? (
                <TableEmpty
                  icon={<Package className="w-12 h-12" />}
                  title="No matching transactions"
                  description="Try adjusting your search or filters"
                  action={
                    <Button variant="primary" size="sm" onClick={clearFilters}>
                      Clear Filters
                    </Button>
                  }
                  colSpan={8}
                />
              ) : (
                <TableEmpty
                  icon={<Package className="w-12 h-12" />}
                  title="No transactions yet"
                  description="Transactions will appear here once inventory movements are recorded"
                  colSpan={8}
                />
              )
            ) : (
              sortedTransactions.map((tx) => {
                const item = tx.item;
                return (
                  <TableRow
                    key={tx.id}
                    className="cursor-pointer hover:bg-background-tertiary"
                    onClick={() => handleRowClick(tx)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-foreground-muted" />
                        <span className="text-sm">
                          {formatDateTime(tx.event_timestamp)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getTransactionIcon(tx.transaction_type)}
                        <TransactionTypeBadge type={tx.transaction_type} size="sm" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground">
                          {item?.name || "Unknown"}
                        </p>
                        <p className="text-xs text-foreground-muted">
                          {item?.sku || "-"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {(() => {
                        const { sign, colorClass } = getQuantityDisplay(tx.transaction_type);
                        return (
                          <span className={colorClass}>
                            {sign}{tx.quantity}
                          </span>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-right font-mono text-foreground-muted">
                      {tx.stock_before ?? "-"}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {tx.stock_after ?? "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary-50 flex items-center justify-center">
                          <User className="w-3 h-3 text-primary" />
                        </div>
                        <span className="text-sm">{getUserName(tx.user_id, tx.user)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <SyncStatusIndicator
                        status={tx.sync_status as SyncStatus}
                        size="sm"
                        showLabel={false}
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-foreground-muted">Items per page:</span>
          <Select
            options={[
              { value: "10", label: "10" },
              { value: "25", label: "25" },
              { value: "50", label: "50" },
              { value: "100", label: "100" },
            ]}
            value={pageSize.toString()}
            onChange={(value) => {
              setPageSize(parseInt(value, 10));
              setCurrentPage(1);
            }}
            className="w-20"
          />
        </div>
        <div className="flex items-center gap-1">
          <IconButton
            icon={<ChevronsLeft className="w-4 h-4" />}
            aria-label="First page"
            variant="ghost"
            size="sm"
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
          />
          <IconButton
            icon={<ChevronLeft className="w-4 h-4" />}
            aria-label="Previous page"
            variant="ghost"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          />
          {getPageNumbers(currentPage, totalPages || 1).map((page, idx) =>
            page === "ellipsis" ? (
              <span key={`ellipsis-${idx}`} className="px-1 text-foreground-muted">...</span>
            ) : (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                  page === currentPage
                    ? "bg-primary text-white"
                    : "text-foreground-secondary hover:bg-background-tertiary"
                }`}
              >
                {page}
              </button>
            )
          )}
          <IconButton
            icon={<ChevronRight className="w-4 h-4" />}
            aria-label="Next page"
            variant="ghost"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
          />
          <IconButton
            icon={<ChevronsRight className="w-4 h-4" />}
            aria-label="Last page"
            variant="ghost"
            size="sm"
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage >= totalPages}
          />
        </div>
      </div>

      {/* Transaction Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        size="lg"
      >
        <ModalHeader showCloseButton onClose={() => setDetailModalOpen(false)}>
          Transaction Details
        </ModalHeader>
        <ModalBody>
          {selectedTransaction && (
            <div className="space-y-6">
              {/* Transaction type and status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getTransactionIcon(selectedTransaction.transaction_type)}
                  <TransactionTypeBadge type={selectedTransaction.transaction_type} />
                </div>
                <SyncStatusIndicator
                  status={selectedTransaction.sync_status as SyncStatus}
                  showLabel
                />
              </div>

              {/* Item info */}
              <div className="bg-background-tertiary rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary-50 rounded-lg flex items-center justify-center">
                    <Package className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">
                      {selectedTransaction.item?.name || "Unknown Item"}
                    </p>
                    <p className="text-sm text-foreground-muted">
                      {selectedTransaction.item?.sku || "No SKU"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-foreground-muted uppercase tracking-wider mb-1">
                    Quantity
                  </p>
                  <p className="font-semibold text-lg">
                    {getQuantityDisplay(selectedTransaction.transaction_type).sign || "-"}
                    {selectedTransaction.quantity}{" "}
                    {selectedTransaction.item?.unit || "units"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-foreground-muted uppercase tracking-wider mb-1">
                    Stock Change
                  </p>
                  <p className="font-semibold text-lg">
                    {selectedTransaction.stock_before ?? "?"} →{" "}
                    {selectedTransaction.stock_after ?? "?"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-foreground-muted uppercase tracking-wider mb-1">
                    Date & Time
                  </p>
                  <p className="font-medium">
                    {formatDateTime(selectedTransaction.event_timestamp)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-foreground-muted uppercase tracking-wider mb-1">
                    Performed By
                  </p>
                  <p className="font-medium">
                    {getUserName(selectedTransaction.user_id, selectedTransaction.user)}
                  </p>
                </div>
              </div>

              {/* Location info for transfers */}
              {selectedTransaction.transaction_type === "transfer" && (
                <div className="border-t border-border pt-4">
                  <p className="text-xs text-foreground-muted uppercase tracking-wider mb-3">
                    Transfer Details
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 bg-background-tertiary rounded-lg p-3">
                      <div className="flex items-center gap-2 text-sm text-foreground-muted mb-1">
                        <MapPin className="w-4 h-4" />
                        From
                      </div>
                      <p className="font-medium">
                        {selectedTransaction.source_location?.name || "-"}
                      </p>
                    </div>
                    <ArrowRightLeft className="w-5 h-5 text-foreground-muted" />
                    <div className="flex-1 bg-background-tertiary rounded-lg p-3">
                      <div className="flex items-center gap-2 text-sm text-foreground-muted mb-1">
                        <MapPin className="w-4 h-4" />
                        To
                      </div>
                      <p className="font-medium">
                        {selectedTransaction.destination_location?.name || "-"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedTransaction.notes && (
                <div className="border-t border-border pt-4">
                  <p className="text-xs text-foreground-muted uppercase tracking-wider mb-2">
                    Notes
                  </p>
                  <p className="text-sm text-foreground bg-background-tertiary rounded-lg p-3">
                    {selectedTransaction.notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setDetailModalOpen(false)}>
            Close
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
