"use client";

import * as React from "react";
import {
  Search,
  Filter,
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
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  IconButton,
  SearchInput,
  Select,
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
  Alert,
  Badge,
} from "@/components/ui";
import { TransactionTypeBadge, SyncStatusIndicator } from "@/components/ui";
import { getTransactions } from "@/lib/actions/transactions";
import { getItems } from "@/lib/actions/items";
import { getUsers } from "@/lib/actions/users";
import { getLocations } from "@/lib/actions/locations";
import type { Transaction, Item, Profile, Location, TransactionType, SyncStatus } from "@/lib/supabase/types";
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

const getTransactionIcon = (type: TransactionType) => {
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
      return <Package className="w-4 h-4 text-neutral-400" />;
  }
};

export default function TransactionsPage() {
  // Data state
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [items, setItems] = React.useState<Item[]>([]);
  const [users, setUsers] = React.useState<Profile[]>([]);
  const [locations, setLocations] = React.useState<Location[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("");
  const [userFilter, setUserFilter] = React.useState("");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");

  // Detail modal state
  const [selectedTransaction, setSelectedTransaction] = React.useState<Transaction | null>(null);
  const [detailModalOpen, setDetailModalOpen] = React.useState(false);

  // Create lookup maps
  const itemMap = React.useMemo(() => {
    const map = new Map<string, Item>();
    items.forEach((item) => map.set(item.id, item));
    return map;
  }, [items]);

  const userMap = React.useMemo(() => {
    const map = new Map<string, Profile>();
    users.forEach((user) => map.set(user.id, user));
    return map;
  }, [users]);

  const locationMap = React.useMemo(() => {
    const map = new Map<string, Location>();
    locations.forEach((loc) => map.set(loc.id, loc));
    return map;
  }, [locations]);

  // Fetch data
  const fetchData = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [transactionsResult, itemsResult, usersResult, locationsResult] = await Promise.all([
        getTransactions({
          transactionType: typeFilter as TransactionType || undefined,
          userId: userFilter || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        }),
        getItems(),
        getUsers(),
        getLocations(),
      ]);

      if (transactionsResult.success) {
        setTransactions(transactionsResult.data);
      } else {
        setError(transactionsResult.error || "Failed to load transactions");
        return;
      }

      if (itemsResult.success) {
        setItems(itemsResult.data);
      }

      if (usersResult.success) {
        setUsers(usersResult.data);
      }

      if (locationsResult.success) {
        setLocations(locationsResult.data);
      }
    } catch (err) {
      setError("An unexpected error occurred");
      console.error("Error fetching data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [typeFilter, userFilter, startDate, endDate]);

  // Initial fetch
  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter transactions by search query
  const filteredTransactions = React.useMemo(() => {
    if (!searchQuery.trim()) return transactions;

    const query = searchQuery.toLowerCase();
    return transactions.filter((tx) => {
      const item = itemMap.get(tx.item_id);
      const user = userMap.get(tx.user_id);
      return (
        item?.name.toLowerCase().includes(query) ||
        item?.sku.toLowerCase().includes(query) ||
        user?.first_name?.toLowerCase().includes(query) ||
        user?.last_name?.toLowerCase().includes(query) ||
        tx.notes?.toLowerCase().includes(query) ||
        tx.transaction_type.toLowerCase().includes(query)
      );
    });
  }, [transactions, searchQuery, itemMap, userMap]);

  // Handle row click
  const handleRowClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setDetailModalOpen(true);
  };

  // Clear filters
  const clearFilters = () => {
    setSearchQuery("");
    setTypeFilter("");
    setUserFilter("");
    setStartDate("");
    setEndDate("");
  };

  const hasActiveFilters = searchQuery || typeFilter || userFilter || startDate || endDate;

  // Get user display name
  const getUserName = (userId: string) => {
    const user = userMap.get(userId);
    if (!user) return "Unknown";
    return user.first_name && user.last_name
      ? `${user.first_name} ${user.last_name}`
      : user.email || "Unknown";
  };

  // Get item display name
  const getItemName = (itemId: string) => {
    const item = itemMap.get(itemId);
    return item?.name || "Unknown Item";
  };

  // Get location display name
  const getLocationName = (locationId: string | null) => {
    if (!locationId) return "-";
    const location = locationMap.get(locationId);
    return location?.name || "Unknown Location";
  };

  // Export to CSV
  const handleExport = () => {
    const headers = ["Date", "Type", "Item", "Quantity", "Stock Before", "Stock After", "User", "Notes", "Status"];
    const rows = filteredTransactions.map((tx) => [
      formatDateTime(tx.server_timestamp),
      tx.transaction_type,
      getItemName(tx.item_id),
      tx.quantity.toString(),
      tx.stock_before?.toString() || "",
      tx.stock_after?.toString() || "",
      getUserName(tx.user_id),
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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">
            Transactions
          </h1>
          <p className="text-foreground-muted text-sm mt-1">
            View and manage all inventory transactions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            leftIcon={<Download className="w-4 h-4" />}
            onClick={handleExport}
            disabled={isLoading || filteredTransactions.length === 0}
          >
            Export
          </Button>
          <Button
            variant="outline"
            leftIcon={<RefreshCw className="w-4 h-4" />}
            onClick={fetchData}
            disabled={isLoading}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card variant="elevated">
        <CardBody className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <SearchInput
                placeholder="Search by item, user, notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClear={() => setSearchQuery("")}
              />
            </div>

            {/* Type Filter */}
            <Select
              options={TRANSACTION_TYPE_OPTIONS}
              value={typeFilter}
              onChange={(value) => setTypeFilter(value)}
            />

            {/* User Filter */}
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
            />

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<X className="w-4 h-4" />}
                onClick={clearFilters}
              >
                Clear
              </Button>
            )}
          </div>

          {/* Date Range */}
          <div className="flex flex-wrap gap-4 mt-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-foreground-muted" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="Start Date"
              />
              <span className="text-foreground-muted">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="End Date"
              />
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Error State */}
      {error && (
        <Alert status="error" variant="subtle">
          {error}
        </Alert>
      )}

      {/* Transactions Table */}
      <Card variant="elevated">
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Before</TableHead>
                  <TableHead className="text-right">After</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredTransactions.length === 0 ? (
                  <TableEmpty
                    icon={<Package className="w-12 h-12" />}
                    title="No transactions found"
                    description={
                      hasActiveFilters
                        ? "Try adjusting your filters"
                        : "Transactions will appear here once created"
                    }
                    action={
                      hasActiveFilters && (
                        <Button variant="outline" size="sm" onClick={clearFilters}>
                          Clear Filters
                        </Button>
                      )
                    }
                  />
                ) : (
                  filteredTransactions.map((tx) => {
                    const item = itemMap.get(tx.item_id);
                    return (
                      <TableRow
                        key={tx.id}
                        className="cursor-pointer hover:bg-neutral-50"
                        onClick={() => handleRowClick(tx)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-foreground-muted" />
                            <span className="text-sm">
                              {formatDateTime(tx.server_timestamp)}
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
                          <span
                            className={
                              tx.transaction_type === "check_in" || tx.transaction_type === "return"
                                ? "text-success"
                                : tx.transaction_type === "check_out" || tx.transaction_type === "write_off"
                                ? "text-error"
                                : ""
                            }
                          >
                            {tx.transaction_type === "check_in" || tx.transaction_type === "return"
                              ? "+"
                              : tx.transaction_type === "check_out" || tx.transaction_type === "write_off"
                              ? "-"
                              : ""}
                            {tx.quantity}
                          </span>
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
                            <span className="text-sm">{getUserName(tx.user_id)}</span>
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
          </div>
        </CardBody>

        {/* Results count */}
        {!isLoading && filteredTransactions.length > 0 && (
          <div className="px-6 py-4 border-t border-neutral-100">
            <p className="text-sm text-foreground-muted">
              Showing {filteredTransactions.length} of {transactions.length} transactions
            </p>
          </div>
        )}
      </Card>

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
              <div className="bg-neutral-50 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary-50 rounded-lg flex items-center justify-center">
                    <Package className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">
                      {getItemName(selectedTransaction.item_id)}
                    </p>
                    <p className="text-sm text-foreground-muted">
                      {itemMap.get(selectedTransaction.item_id)?.sku || "No SKU"}
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
                    {selectedTransaction.transaction_type === "check_in" ||
                    selectedTransaction.transaction_type === "return"
                      ? "+"
                      : "-"}
                    {selectedTransaction.quantity}{" "}
                    {itemMap.get(selectedTransaction.item_id)?.unit || "units"}
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
                    {formatDateTime(selectedTransaction.server_timestamp)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-foreground-muted uppercase tracking-wider mb-1">
                    Performed By
                  </p>
                  <p className="font-medium">
                    {getUserName(selectedTransaction.user_id)}
                  </p>
                </div>
              </div>

              {/* Location info for transfers */}
              {selectedTransaction.transaction_type === "transfer" && (
                <div className="border-t border-neutral-100 pt-4">
                  <p className="text-xs text-foreground-muted uppercase tracking-wider mb-3">
                    Transfer Details
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 bg-neutral-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-sm text-foreground-muted mb-1">
                        <MapPin className="w-4 h-4" />
                        From
                      </div>
                      <p className="font-medium">
                        {getLocationName(selectedTransaction.source_location_id)}
                      </p>
                    </div>
                    <ArrowRightLeft className="w-5 h-5 text-foreground-muted" />
                    <div className="flex-1 bg-neutral-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-sm text-foreground-muted mb-1">
                        <MapPin className="w-4 h-4" />
                        To
                      </div>
                      <p className="font-medium">
                        {getLocationName(selectedTransaction.destination_location_id)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedTransaction.notes && (
                <div className="border-t border-neutral-100 pt-4">
                  <p className="text-xs text-foreground-muted uppercase tracking-wider mb-2">
                    Notes
                  </p>
                  <p className="text-sm text-foreground bg-neutral-50 rounded-lg p-3">
                    {selectedTransaction.notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setDetailModalOpen(false)}>
            Close
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
