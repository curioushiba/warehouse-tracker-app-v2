"use client";

import * as React from "react";
import {
  Calendar,
  Filter,
  ChevronLeft,
  ChevronRight,
  Clock,
  Package,
  User,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import {
  Card,
  Button,
  IconButton,
  Badge,
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
  Input,
  Select,
  FormControl,
  FormLabel,
  Skeleton,
  SkeletonTableRow,
  Alert,
} from "@/components/ui";
import {
  getProductionLogs,
  getProductionLogById,
  getCommissaryItems,
} from "@/lib/actions/commissary";
import type {
  ProductionLogWithDetails,
  ProductionLogFilters,
} from "@/lib/actions/commissary";
import type { Item, Profile } from "@/lib/supabase/types";
import { getUsers } from "@/lib/actions";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

function formatProductionDate(timestamp: string): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatFullTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

export default function ProductionHistoryPage() {
  const [logs, setLogs] = React.useState<ProductionLogWithDetails[]>([]);
  const [items, setItems] = React.useState<Item[]>([]);
  const [users, setUsers] = React.useState<Profile[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isInitialLoad, setIsInitialLoad] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize] = React.useState(25);
  const [totalCount, setTotalCount] = React.useState(0);
  const [totalPages, setTotalPages] = React.useState(0);

  // Filter state
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [itemFilter, setItemFilter] = React.useState("");
  const [userFilter, setUserFilter] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");

  // Detail modal state
  const [selectedLog, setSelectedLog] =
    React.useState<ProductionLogWithDetails | null>(null);
  const [detailModalOpen, setDetailModalOpen] = React.useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = React.useState(false);

  // Fetch items and users once on mount
  React.useEffect(() => {
    Promise.all([getCommissaryItems(), getUsers()]).then(
      ([itemsResult, usersResult]) => {
        if (itemsResult.success) setItems(itemsResult.data);
        if (usersResult.success) setUsers(usersResult.data);
      }
    );
  }, []);

  const fetchData = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const filters: ProductionLogFilters = {
        page: currentPage,
        pageSize,
        itemId: itemFilter || undefined,
        userId: userFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        status:
          (statusFilter as ProductionLogFilters["status"]) || undefined,
      };

      const result = await getProductionLogs(filters);

      if (result.success) {
        setLogs(result.data.data);
        setTotalCount(result.data.totalCount);
        setTotalPages(result.data.totalPages);
      } else {
        setError(result.error || "Failed to load production logs");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
      setIsInitialLoad(false);
    }
  }, [currentPage, pageSize, itemFilter, userFilter, dateFrom, dateTo, statusFilter]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [itemFilter, userFilter, dateFrom, dateTo, statusFilter]);

  const handleApplyFilters = () => {
    setCurrentPage(1);
    fetchData();
  };

  const handleClearFilters = () => {
    setDateFrom("");
    setDateTo("");
    setItemFilter("");
    setUserFilter("");
    setStatusFilter("");
    setCurrentPage(1);
  };

  const hasActiveFilters =
    dateFrom || dateTo || itemFilter || userFilter || statusFilter;

  const handleRowClick = async (log: ProductionLogWithDetails) => {
    setSelectedLog(log);
    setDetailModalOpen(true);
    setIsLoadingDetail(true);

    try {
      const result = await getProductionLogById(log.id);
      if (result.success) {
        setSelectedLog(result.data);
      }
    } catch {
      // Keep the row data we already have
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  // Item options for filter
  const itemOptions = React.useMemo(
    () => [
      { value: "", label: "All Items" },
      ...items.map((item) => ({
        value: item.id,
        label: item.name,
      })),
    ],
    [items]
  );

  // User options for filter
  const userOptions = React.useMemo(
    () => [
      { value: "", label: "All Users" },
      ...users.map((u) => ({
        value: u.id,
        label:
          u.first_name && u.last_name
            ? `${u.first_name} ${u.last_name}`
            : u.email || u.username,
      })),
    ],
    [users]
  );

  // Full-page error state
  if (error && logs.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="w-12 h-12 text-error mb-4" />
        <h2 className="text-xl font-semibold mb-2">
          Failed to Load Production Logs
        </h2>
        <p className="text-foreground-muted mb-4">{error}</p>
        <Button
          onClick={fetchData}
          leftIcon={<RefreshCw className="w-4 h-4" />}
        >
          Try Again
        </Button>
      </div>
    );
  }

  // Initial load skeleton
  if (isLoading && isInitialLoad) {
    return (
      <div className="space-y-6">
        {/* Filters skeleton */}
        <Card variant="outline" size="sm">
          <div className="flex flex-wrap items-end gap-3">
            <Skeleton className="h-10 w-36" />
            <Skeleton className="h-10 w-36" />
            <Skeleton className="h-10 w-44" />
            <Skeleton className="h-10 w-44" />
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-20" />
          </div>
        </Card>
        {/* Table skeleton */}
        <Card variant="elevated" className="overflow-hidden">
          <Table variant="simple" size="md">
            <TableHeader>
              <TableRow>
                <TableHead>Date/Time</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Qty Produced</TableHead>
                <TableHead>Expected</TableHead>
                <TableHead>Waste</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Notes</TableHead>
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
      {error && logs.length > 0 && (
        <Alert
          status="error"
          variant="subtle"
          isClosable
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      {/* Filters Bar */}
      <Card variant="outline" size="sm">
        <div className="flex flex-wrap items-end gap-3">
          <FormControl>
            <FormLabel size="sm">From</FormLabel>
            <Input
              type="date"
              size="sm"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-36"
            />
          </FormControl>
          <FormControl>
            <FormLabel size="sm">To</FormLabel>
            <Input
              type="date"
              size="sm"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-36"
            />
          </FormControl>
          <FormControl>
            <FormLabel size="sm">Item</FormLabel>
            <Select
              options={itemOptions}
              value={itemFilter}
              onChange={(value) => setItemFilter(value)}
              size="sm"
              className="w-44"
            />
          </FormControl>
          <FormControl>
            <FormLabel size="sm">User</FormLabel>
            <Select
              options={userOptions}
              value={userFilter}
              onChange={(value) => setUserFilter(value)}
              size="sm"
              className="w-44"
            />
          </FormControl>
          <FormControl>
            <FormLabel size="sm">Status</FormLabel>
            <Select
              options={STATUS_OPTIONS}
              value={statusFilter}
              onChange={(value) => setStatusFilter(value)}
              size="sm"
              className="w-36"
            />
          </FormControl>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="primary"
              leftIcon={<Filter className="w-4 h-4" />}
              onClick={handleApplyFilters}
            >
              Apply
            </Button>
            {hasActiveFilters && (
              <Button size="sm" variant="ghost" onClick={handleClearFilters}>
                Clear
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Result count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-foreground-muted">
          Showing{" "}
          {totalCount === 0
            ? 0
            : (currentPage - 1) * pageSize + 1}
          -{Math.min(currentPage * pageSize, totalCount)} of {totalCount}{" "}
          production logs
        </p>
        <IconButton
          icon={<RefreshCw className="w-4 h-4" />}
          aria-label="Refresh production logs"
          variant="ghost"
          size="sm"
          onClick={fetchData}
          disabled={isLoading}
        />
      </div>

      {/* Production Logs Table */}
      <Card variant="elevated" className="overflow-hidden">
        <Table variant="simple" size="md">
          <TableHeader>
            <TableRow>
              <TableHead>Date/Time</TableHead>
              <TableHead>Item</TableHead>
              <TableHead className="text-right">Qty Produced</TableHead>
              <TableHead className="text-right">Expected</TableHead>
              <TableHead className="text-right">Waste</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              hasActiveFilters ? (
                <TableEmpty
                  icon={<Package className="w-12 h-12" />}
                  title="No matching production logs"
                  description="Try adjusting your filters"
                  action={
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleClearFilters}
                    >
                      Clear Filters
                    </Button>
                  }
                  colSpan={8}
                />
              ) : (
                <TableEmpty
                  icon={<Package className="w-12 h-12" />}
                  title="No production logs yet"
                  description="Production logs will appear here once production entries are recorded"
                  colSpan={8}
                />
              )
            ) : (
              logs.map((log) => (
                <TableRow
                  key={log.id}
                  isClickable
                  onClick={() => handleRowClick(log)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-foreground-muted flex-shrink-0" />
                      <span className="text-sm whitespace-nowrap">
                        {formatProductionDate(log.event_timestamp)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-foreground">
                        {log.item_name}
                      </p>
                      <p className="text-xs text-foreground-muted">
                        {log.item_sku || "-"}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {log.quantity_produced}
                  </TableCell>
                  <TableCell className="text-right font-mono text-foreground-muted">
                    {log.expected_quantity ?? "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {log.waste_quantity > 0 ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="font-mono text-warning-dark">
                          {log.waste_quantity}
                        </span>
                        {log.waste_reason && (
                          <Badge
                            colorScheme="warning"
                            variant="subtle"
                            size="xs"
                          >
                            {log.waste_reason}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-foreground-muted">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0">
                        <User className="w-3 h-3 text-primary" />
                      </div>
                      <span className="text-sm">{log.user_name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p
                      className={cn(
                        "text-sm max-w-[200px] truncate",
                        log.notes
                          ? "text-foreground-secondary"
                          : "text-foreground-muted"
                      )}
                      title={log.notes || undefined}
                    >
                      {log.notes || "-"}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge
                      colorScheme={
                        log.status === "completed" ? "success" : "error"
                      }
                      variant="subtle"
                      size="sm"
                    >
                      {log.status === "completed" ? "Completed" : "Cancelled"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-foreground-muted">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<ChevronLeft className="w-4 h-4" />}
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              rightIcon={<ChevronRight className="w-4 h-4" />}
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        size="lg"
      >
        <ModalHeader showCloseButton onClose={() => setDetailModalOpen(false)}>
          Production Log Details
        </ModalHeader>
        <ModalBody>
          {selectedLog && (
            <div className="space-y-6">
              {/* Item info */}
              <div className="bg-background-tertiary rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary-50 rounded-lg flex items-center justify-center">
                    <Package className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">
                      {selectedLog.item_name}
                    </p>
                    <p className="text-sm text-foreground-muted">
                      {selectedLog.item_sku || "No SKU"}
                    </p>
                  </div>
                  <Badge
                    colorScheme={
                      selectedLog.status === "completed" ? "success" : "error"
                    }
                    variant="subtle"
                  >
                    {selectedLog.status === "completed"
                      ? "Completed"
                      : "Cancelled"}
                  </Badge>
                </div>
              </div>

              {/* Production details grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-foreground-muted uppercase tracking-wider mb-1">
                    Quantity Produced
                  </p>
                  <p className="font-semibold text-lg">
                    {selectedLog.quantity_produced}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-foreground-muted uppercase tracking-wider mb-1">
                    Expected Quantity
                  </p>
                  <p className="font-semibold text-lg">
                    {selectedLog.expected_quantity ?? "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-foreground-muted uppercase tracking-wider mb-1">
                    Waste
                  </p>
                  <div>
                    <p
                      className={cn(
                        "font-semibold text-lg",
                        selectedLog.waste_quantity > 0 && "text-warning-dark"
                      )}
                    >
                      {selectedLog.waste_quantity}
                    </p>
                    {selectedLog.waste_reason && (
                      <Badge
                        colorScheme="warning"
                        variant="subtle"
                        size="xs"
                        className="mt-1"
                      >
                        {selectedLog.waste_reason}
                      </Badge>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-foreground-muted uppercase tracking-wider mb-1">
                    Performed By
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary-50 flex items-center justify-center">
                      <User className="w-3 h-3 text-primary" />
                    </div>
                    <p className="font-medium">{selectedLog.user_name}</p>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedLog.notes && (
                <div className="border-t border-border pt-4">
                  <p className="text-xs text-foreground-muted uppercase tracking-wider mb-2">
                    Notes
                  </p>
                  <p className="text-sm text-foreground bg-background-tertiary rounded-lg p-3">
                    {selectedLog.notes}
                  </p>
                </div>
              )}

              {/* Timestamps */}
              <div className="border-t border-border pt-4">
                <p className="text-xs text-foreground-muted uppercase tracking-wider mb-3">
                  Timestamps
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-foreground-muted flex-shrink-0" />
                    <span className="text-foreground-muted w-28 flex-shrink-0">
                      Device:
                    </span>
                    <span className="text-foreground">
                      {formatFullTimestamp(selectedLog.device_timestamp)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-foreground-muted flex-shrink-0" />
                    <span className="text-foreground-muted w-28 flex-shrink-0">
                      Event:
                    </span>
                    <span className="text-foreground">
                      {formatFullTimestamp(selectedLog.event_timestamp)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <AlertCircle className="w-4 h-4 text-foreground-muted flex-shrink-0" />
                    <span className="text-foreground-muted w-28 flex-shrink-0">
                      Server:
                    </span>
                    <span className="text-foreground">
                      {formatFullTimestamp(selectedLog.server_timestamp)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button
            variant="secondary"
            onClick={() => setDetailModalOpen(false)}
          >
            Close
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
