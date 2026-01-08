"use client";

import * as React from "react";
import {
  Package,
  Calendar,
  Filter,
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
  FileText,
  ChevronRight,
  Search,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import {
  Card,
  CardBody,
  Button,
  SearchInput,
  Select,
  Badge,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Divider,
} from "@/components/ui";
import {
  TransactionTypeBadge,
  SyncStatusIndicator,
} from "@/components/ui";
import { formatDateTime, formatRelativeTime } from "@/lib/utils";
import { useAuthContext } from "@/contexts/AuthContext";
import {
  getEmployeeTransactionsWithItemsPaginated,
  type EmployeeTransactionWithItem,
} from "@/lib/actions/transactions";

type TransactionFilter = "all" | "check_in" | "check_out" | "transfer" | "adjustment";
type DateFilter = "all" | "today" | "week" | "month";

// Use the base type directly - userName is derived from currentUserName for all transactions
type TransactionWithDetails = EmployeeTransactionWithItem;

const PAGE_SIZE = 20;

export default function HistoryPage() {
  const { user, profile, isLoading: authLoading } = useAuthContext();

  const [transactions, setTransactions] = React.useState<TransactionWithDetails[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [hasMore, setHasMore] = React.useState(false);
  const [totalCount, setTotalCount] = React.useState(0);

  const [searchQuery, setSearchQuery] = React.useState("");
  const [transactionFilter, setTransactionFilter] =
    React.useState<TransactionFilter>("all");
  const [dateFilter, setDateFilter] = React.useState<DateFilter>("all");
  const [selectedTransaction, setSelectedTransaction] = React.useState<TransactionWithDetails | null>(null);
  const [showFilters, setShowFilters] = React.useState(false);

  // Derive the current user's display name from profile
  const currentUserName = React.useMemo(() => {
    if (profile) {
      if (profile.name) return profile.name;
      if (profile.first_name && profile.last_name) return `${profile.first_name} ${profile.last_name}`;
      if (profile.first_name) return profile.first_name;
      if (profile.username) return profile.username;
    }
    return "Me";
  }, [profile]);

  // Fetch initial transactions with pagination
  const fetchData = React.useCallback(async () => {
    if (!user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await getEmployeeTransactionsWithItemsPaginated(user.id, {
        limit: PAGE_SIZE,
        offset: 0,
      });

      if (!result.success) {
        setError(result.error);
        setIsLoading(false);
        return;
      }

      setTransactions(result.data.data);
      setHasMore(result.data.hasMore);
      setTotalCount(result.data.totalCount);
    } catch (err) {
      setError('Failed to load transactions');
    }

    setIsLoading(false);
  }, [user?.id]);

  // Load more transactions
  const loadMore = React.useCallback(async () => {
    if (!user?.id || isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);

    try {
      const result = await getEmployeeTransactionsWithItemsPaginated(user.id, {
        limit: PAGE_SIZE,
        offset: transactions.length,
      });

      if (result.success) {
        setTransactions(prev => [...prev, ...result.data.data]);
        setHasMore(result.data.hasMore);
      }
    } catch (err) {
      console.error('Failed to load more transactions:', err);
    }

    setIsLoadingMore(false);
  }, [user?.id, isLoadingMore, hasMore, transactions.length]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredTransactions = React.useMemo(() => {
    let filtered = [...transactions];

    // Search filter - search by item name only (all transactions are from current user)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) => t.item?.name?.toLowerCase().includes(query)
      );
    }

    // Transaction type filter
    if (transactionFilter !== "all") {
      filtered = filtered.filter((t) => t.transaction_type === transactionFilter);
    }

    // Date filter
    if (dateFilter !== "all") {
      const now = new Date();
      const filterDate = new Date();

      if (dateFilter === "today") {
        filterDate.setHours(0, 0, 0, 0);
      } else if (dateFilter === "week") {
        filterDate.setDate(now.getDate() - 7);
      } else if (dateFilter === "month") {
        filterDate.setMonth(now.getMonth() - 1);
      }

      filtered = filtered.filter(
        (t) => new Date(t.event_timestamp) >= filterDate
      );
    }

    // Sort by date (most recent first)
    filtered.sort(
      (a, b) =>
        new Date(b.event_timestamp).getTime() - new Date(a.event_timestamp).getTime()
    );

    return filtered;
  }, [transactions, searchQuery, transactionFilter, dateFilter]);

  const transactionOptions = [
    { value: "all", label: "All Types" },
    { value: "check_in", label: "Check In" },
    { value: "check_out", label: "Check Out" },
    { value: "transfer", label: "Transfer" },
    { value: "adjustment", label: "Adjustment" },
  ];

  const dateOptions = [
    { value: "all", label: "All Time" },
    { value: "today", label: "Today" },
    { value: "week", label: "This Week" },
    { value: "month", label: "This Month" },
  ];

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "check_in":
      case "return":
        return <TrendingUp className="w-5 h-5 text-success" />;
      case "check_out":
        return <TrendingDown className="w-5 h-5 text-error" />;
      case "transfer":
        return <ArrowLeftRight className="w-5 h-5 text-info" />;
      case "adjustment":
      case "write_off":
        return <FileText className="w-5 h-5 text-warning" />;
      default:
        return <Package className="w-5 h-5 text-foreground-muted" />;
    }
  };

  const getTransactionBgColor = (type: string) => {
    switch (type) {
      case "check_in":
      case "return":
        return "bg-success-light";
      case "check_out":
        return "bg-error-light";
      case "transfer":
        return "bg-info-light";
      case "adjustment":
      case "write_off":
        return "bg-warning-light";
      default:
        return "bg-neutral-100";
    }
  };

  // Group transactions by date
  const groupedTransactions = React.useMemo(() => {
    const groups: Record<string, TransactionWithDetails[]> = {};

    filteredTransactions.forEach((transaction) => {
      const date = new Date(transaction.event_timestamp);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);

      let groupKey: string;

      if (date.toDateString() === today.toDateString()) {
        groupKey = "Today";
      } else if (date.toDateString() === yesterday.toDateString()) {
        groupKey = "Yesterday";
      } else {
        groupKey = date.toLocaleDateString("en-US", {
          weekday: "long",
          month: "short",
          day: "numeric",
        });
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(transaction);
    });

    return groups;
  }, [filteredTransactions]);

  const activeFilters =
    (transactionFilter !== "all" ? 1 : 0) + (dateFilter !== "all" ? 1 : 0);

  // Loading state
  if (authLoading || isLoading) {
    return (
      <div className="space-y-6">
        {/* Search Bar Skeleton */}
        <div className="flex gap-3">
          <div className="flex-1 h-10 bg-neutral-200 rounded-lg animate-pulse" />
          <div className="w-10 h-10 bg-neutral-200 rounded-lg animate-pulse" />
        </div>

        {/* Transaction Skeletons */}
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} variant="elevated">
              <CardBody className="p-4">
                <div className="flex items-center gap-4 animate-pulse">
                  <div className="w-12 h-12 rounded-xl bg-neutral-200" />
                  <div className="flex-1">
                    <div className="h-4 w-32 bg-neutral-200 rounded mb-2" />
                    <div className="h-3 w-24 bg-neutral-100 rounded" />
                  </div>
                  <div className="h-4 w-8 bg-neutral-200 rounded" />
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <Card variant="outline" className="py-12">
          <CardBody className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-error mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              Failed to load history
            </h3>
            <p className="text-foreground-muted mb-4">{error}</p>
            <Button
              variant="primary"
              leftIcon={<RefreshCw className="w-4 h-4" />}
              onClick={fetchData}
            >
              Retry
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="flex gap-3">
        <div className="flex-1">
          <SearchInput
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClear={() => setSearchQuery("")}
          />
        </div>
        <Button
          variant={showFilters ? "primary" : "secondary"}
          onClick={() => setShowFilters(!showFilters)}
          className="relative"
        >
          <Filter className="w-5 h-5" />
          {activeFilters > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-error rounded-full text-white text-xs flex items-center justify-center">
              {activeFilters}
            </span>
          )}
        </Button>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card variant="filled">
          <CardBody className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground-muted mb-2 block">
                Transaction Type
              </label>
              <Select
                options={transactionOptions}
                value={transactionFilter}
                onChange={(value) =>
                  setTransactionFilter(value as TransactionFilter)
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground-muted mb-2 block">
                Date Range
              </label>
              <Select
                options={dateOptions}
                value={dateFilter}
                onChange={(value) => setDateFilter(value as DateFilter)}
              />
            </div>
            {activeFilters > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setTransactionFilter("all");
                  setDateFilter("all");
                }}
              >
                Clear Filters
              </Button>
            )}
          </CardBody>
        </Card>
      )}

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-foreground-muted">
          {activeFilters > 0 || searchQuery ? (
            <>
              {filteredTransactions.length} of {totalCount} transaction
              {totalCount !== 1 ? "s" : ""}
            </>
          ) : (
            <>
              Showing {transactions.length} of {totalCount} transaction
              {totalCount !== 1 ? "s" : ""}
            </>
          )}
        </p>
        {activeFilters > 0 && (
          <Badge colorScheme="primary" size="sm">
            {activeFilters} filter{activeFilters > 1 ? "s" : ""} active
          </Badge>
        )}
      </div>

      {/* Transaction List */}
      {filteredTransactions.length === 0 ? (
        <Card variant="elevated">
          <CardBody className="text-center py-12">
            <div className="w-16 h-16 bg-neutral-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-foreground-muted" />
            </div>
            <h3 className="font-heading font-semibold text-foreground mb-2">
              No transactions found
            </h3>
            <p className="text-sm text-foreground-muted">
              {transactions.length === 0
                ? "You haven't made any transactions yet"
                : "Try adjusting your search or filters"}
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedTransactions).map(([date, txs]) => (
            <div key={date}>
              <div className="flex items-center gap-3 mb-3">
                <Calendar className="w-4 h-4 text-foreground-muted" />
                <h3 className="text-sm font-semibold text-foreground-muted uppercase tracking-wider">
                  {date}
                </h3>
              </div>
              <div className="space-y-2">
                {txs.map((transaction) => (
                  <Card
                    key={transaction.id}
                    variant="elevated"
                    isHoverable
                    className="cursor-pointer"
                    onClick={() => setSelectedTransaction(transaction)}
                  >
                    <CardBody className="p-4">
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center ${getTransactionBgColor(
                            transaction.transaction_type
                          )}`}
                        >
                          {getTransactionIcon(transaction.transaction_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-medium text-foreground truncate">
                              {transaction.item?.name || 'Unknown Item'}
                            </p>
                            <p
                              className={`font-semibold ${transaction.transaction_type === "check_in" ||
                                  transaction.transaction_type === "return"
                                  ? "text-success"
                                  : transaction.transaction_type === "check_out"
                                    ? "text-error"
                                    : "text-foreground"
                                }`}
                            >
                              {transaction.transaction_type === "check_in" ||
                                transaction.transaction_type === "return"
                                ? "+"
                                : transaction.transaction_type === "check_out"
                                  ? "-"
                                  : ""}
                              {transaction.quantity}
                            </p>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-foreground-muted">
                              {formatRelativeTime(transaction.event_timestamp)}
                            </p>
                            <div className="flex items-center gap-2">
                              <SyncStatusIndicator
                                status={transaction.sync_status}
                                size="xs"
                              />
                              <TransactionTypeBadge
                                type={transaction.transaction_type}
                                size="xs"
                              />
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-foreground-muted" />
                      </div>
                    </CardBody>
                  </Card>
                ))}
              </div>
            </div>
          ))}

          {/* Load More Button */}
          {hasMore && !activeFilters && !searchQuery && (
            <div className="flex justify-center pt-4">
              <Button
                variant="secondary"
                onClick={loadMore}
                isLoading={isLoadingMore}
                leftIcon={!isLoadingMore ? <RefreshCw className="w-4 h-4" /> : undefined}
              >
                {isLoadingMore ? "Loading..." : "Load More"}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Transaction Detail Modal */}
      <Modal
        isOpen={!!selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
        size="lg"
      >
        <ModalHeader
          showCloseButton
          onClose={() => setSelectedTransaction(null)}
        >
          Transaction Details
        </ModalHeader>
        <ModalBody>
          {selectedTransaction && (
            <div className="space-y-4">
              {/* Item Info */}
              <div className="flex items-start gap-4">
                <div
                  className={`w-14 h-14 rounded-xl flex items-center justify-center ${getTransactionBgColor(
                    selectedTransaction.transaction_type
                  )}`}
                >
                  {getTransactionIcon(selectedTransaction.transaction_type)}
                </div>
                <div className="flex-1">
                  <h3 className="font-heading font-semibold text-foreground text-lg">
                    {selectedTransaction.item?.name || 'Unknown Item'}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <TransactionTypeBadge
                      type={selectedTransaction.transaction_type}
                      size="sm"
                    />
                    <SyncStatusIndicator
                      status={selectedTransaction.sync_status}
                      size="sm"
                      showLabel
                    />
                  </div>
                </div>
              </div>

              <Divider />

              {/* Details Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-foreground-muted">Quantity</span>
                  <span
                    className={`font-semibold ${selectedTransaction.transaction_type === "check_in" ||
                        selectedTransaction.transaction_type === "return"
                        ? "text-success"
                        : selectedTransaction.transaction_type === "check_out"
                          ? "text-error"
                          : "text-foreground"
                      }`}
                  >
                    {selectedTransaction.transaction_type === "check_in" ||
                      selectedTransaction.transaction_type === "return"
                      ? "+"
                      : selectedTransaction.transaction_type === "check_out"
                        ? "-"
                        : ""}
                    {selectedTransaction.quantity}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-foreground-muted">Performed by</span>
                  <span className="font-medium text-foreground">
                    {currentUserName}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-foreground-muted">Date & Time</span>
                  <span className="font-medium text-foreground">
                    {formatDateTime(selectedTransaction.event_timestamp)}
                  </span>
                </div>
                {selectedTransaction.stock_before !== null && (
                  <div className="flex items-center justify-between">
                    <span className="text-foreground-muted">Stock Before</span>
                    <span className="font-medium text-foreground">
                      {selectedTransaction.stock_before}
                    </span>
                  </div>
                )}
                {selectedTransaction.stock_after !== null && (
                  <div className="flex items-center justify-between">
                    <span className="text-foreground-muted">Stock After</span>
                    <span className="font-medium text-foreground">
                      {selectedTransaction.stock_after}
                    </span>
                  </div>
                )}
                {selectedTransaction.notes && (
                  <>
                    <Divider />
                    <div>
                      <span className="text-foreground-muted block mb-2">
                        Notes
                      </span>
                      <p className="text-foreground bg-neutral-50 rounded-lg p-3 text-sm">
                        {selectedTransaction.notes}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button
            variant="secondary"
            onClick={() => setSelectedTransaction(null)}
          >
            Close
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
