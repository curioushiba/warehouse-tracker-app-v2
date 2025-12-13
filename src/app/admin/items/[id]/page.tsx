"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Edit,
  Archive,
  RotateCcw,
  Package,
  MapPin,
  FolderOpen,
  Barcode,
  DollarSign,
  Clock,
  TrendingUp,
  TrendingDown,
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowRightLeft,
  Wrench,
  Trash2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardBody,
  Button,
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
  Skeleton,
  Alert,
} from "@/components/ui";
import { StockLevelBadge, TransactionTypeBadge, SyncStatusIndicator } from "@/components/ui";
import { getItemById, archiveItem, restoreItem } from "@/lib/actions/items";
import { getItemTransactions } from "@/lib/actions/transactions";
import { getCategories } from "@/lib/actions/categories";
import { getLocations } from "@/lib/actions/locations";
import { getUsers } from "@/lib/actions/users";
import type { Item, Transaction, Category, Location, Profile, TransactionType, SyncStatus } from "@/lib/supabase/types";
import { formatCurrency, formatDateTime, getStockLevel } from "@/lib/utils";

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

export default function ItemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const itemId = params.id as string;

  // Data state
  const [item, setItem] = React.useState<Item | null>(null);
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [category, setCategory] = React.useState<Category | null>(null);
  const [location, setLocation] = React.useState<Location | null>(null);
  const [users, setUsers] = React.useState<Profile[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Modal state
  const [archiveModalOpen, setArchiveModalOpen] = React.useState(false);
  const [isArchiving, setIsArchiving] = React.useState(false);

  // User lookup map
  const userMap = React.useMemo(() => {
    const map = new Map<string, Profile>();
    users.forEach((u) => map.set(u.id, u));
    return map;
  }, [users]);

  // Fetch all data
  const fetchData = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [itemResult, categoriesResult, locationsResult, usersResult] = await Promise.all([
        getItemById(itemId),
        getCategories(),
        getLocations(),
        getUsers(),
      ]);

      if (!itemResult.success) {
        setError(itemResult.error || "Failed to load item");
        return;
      }

      setItem(itemResult.data);
      setUsers(usersResult.success ? usersResult.data : []);

      // Find category and location
      if (categoriesResult.success && itemResult.data.category_id) {
        const cat = categoriesResult.data.find((c) => c.id === itemResult.data.category_id);
        setCategory(cat || null);
      }

      if (locationsResult.success && itemResult.data.location_id) {
        const loc = locationsResult.data.find((l) => l.id === itemResult.data.location_id);
        setLocation(loc || null);
      }

      // Fetch transactions for this item
      const txResult = await getItemTransactions(itemId);
      if (txResult.success) {
        setTransactions(txResult.data);
      }
    } catch (err) {
      setError("An unexpected error occurred");
      console.error("Error fetching data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [itemId]);

  // Initial fetch
  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle archive/restore
  const handleArchiveToggle = async () => {
    if (!item) return;

    setIsArchiving(true);

    try {
      const result = item.is_archived
        ? await restoreItem(item.id)
        : await archiveItem(item.id);

      if (result.success) {
        setItem(result.data);
        setArchiveModalOpen(false);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError("Failed to update item status");
      console.error("Error updating item:", err);
    } finally {
      setIsArchiving(false);
    }
  };

  // Get user name
  const getUserName = (userId: string) => {
    const user = userMap.get(userId);
    if (!user) return "Unknown";
    return user.first_name && user.last_name
      ? `${user.first_name} ${user.last_name}`
      : user.email || "Unknown";
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Card variant="elevated">
          <CardBody className="p-6 space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="space-y-6">
        <Link href="/admin/items">
          <Button variant="ghost" leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Back to Items
          </Button>
        </Link>
        <Alert status="error" variant="subtle">
          {error || "Item not found"}
        </Alert>
      </div>
    );
  }

  const stockLevel = getStockLevel(item.current_stock, item.min_stock ?? 0, item.max_stock ?? 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/items">
            <Button variant="ghost" leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Back
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-heading font-bold text-foreground">
                {item.name}
              </h1>
              {item.is_archived && (
                <Badge colorScheme="neutral" size="sm">
                  Archived
                </Badge>
              )}
            </div>
            <p className="text-foreground-muted text-sm">{item.sku}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            leftIcon={<RefreshCw className="w-4 h-4" />}
            onClick={fetchData}
          >
            Refresh
          </Button>
          <Link href={`/admin/items/${item.id}/edit`}>
            <Button variant="outline" leftIcon={<Edit className="w-4 h-4" />}>
              Edit
            </Button>
          </Link>
          <Button
            variant={item.is_archived ? "primary" : "outline"}
            leftIcon={item.is_archived ? <RotateCcw className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
            onClick={() => setArchiveModalOpen(true)}
          >
            {item.is_archived ? "Restore" : "Archive"}
          </Button>
        </div>
      </div>

      {/* Item Details Card */}
      <Card variant="elevated">
        <CardBody className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Item Image/Icon */}
            <div className="w-24 h-24 bg-primary-50 rounded-2xl flex items-center justify-center shrink-0">
              <Package className="w-12 h-12 text-primary" />
            </div>

            {/* Item Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">{item.name}</h2>
                  <div className="flex items-center gap-3 mt-1 text-sm text-foreground-muted">
                    <span className="flex items-center gap-1">
                      <Barcode className="w-4 h-4" />
                      {item.sku}
                    </span>
                    {item.barcode && (
                      <span className="flex items-center gap-1">
                        Barcode: {item.barcode}
                      </span>
                    )}
                  </div>
                </div>
                <StockLevelBadge level={stockLevel} />
              </div>

              {item.description && (
                <p className="text-foreground-muted mb-4">{item.description}</p>
              )}

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-neutral-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-foreground-muted text-sm mb-1">
                    <Package className="w-4 h-4" />
                    Current Stock
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    {item.current_stock} <span className="text-sm font-normal">{item.unit}</span>
                  </p>
                </div>

                <div className="bg-neutral-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-foreground-muted text-sm mb-1">
                    <TrendingDown className="w-4 h-4" />
                    Min Stock
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    {item.min_stock ?? 0} <span className="text-sm font-normal">{item.unit}</span>
                  </p>
                </div>

                <div className="bg-neutral-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-foreground-muted text-sm mb-1">
                    <TrendingUp className="w-4 h-4" />
                    Max Stock
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    {item.max_stock ?? "-"} <span className="text-sm font-normal">{item.unit}</span>
                  </p>
                </div>

                <div className="bg-neutral-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-foreground-muted text-sm mb-1">
                    <DollarSign className="w-4 h-4" />
                    Unit Price
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(item.unit_price ?? 0)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Metadata Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Category */}
        <Card variant="elevated">
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                <FolderOpen className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-foreground-muted uppercase tracking-wider">Category</p>
                <p className="font-medium text-foreground">
                  {category?.name || "Uncategorized"}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Location */}
        <Card variant="elevated">
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-success-50 rounded-lg flex items-center justify-center">
                <MapPin className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-foreground-muted uppercase tracking-wider">Location</p>
                <p className="font-medium text-foreground">
                  {location?.name || "No location"}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Created */}
        <Card variant="elevated">
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-info-50 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-info" />
              </div>
              <div>
                <p className="text-xs text-foreground-muted uppercase tracking-wider">Created</p>
                <p className="font-medium text-foreground">
                  {formatDateTime(item.created_at)}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Transaction History */}
      <Card variant="elevated">
        <CardHeader className="p-6 pb-0">
          <h3 className="text-lg font-semibold text-foreground">Transaction History</h3>
          <p className="text-sm text-foreground-muted">Recent stock movements for this item</p>
        </CardHeader>
        <CardBody className="p-6">
          <div className="overflow-x-auto -mx-6 px-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Before</TableHead>
                  <TableHead className="text-right">After</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.length === 0 ? (
                  <TableEmpty
                    icon={<Clock className="w-12 h-12" />}
                    title="No transactions yet"
                    description="Transactions will appear here when stock is moved"
                    colSpan={7}
                  />
                ) : (
                  transactions.slice(0, 10).map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-sm">
                        {formatDateTime(tx.server_timestamp)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTransactionIcon(tx.transaction_type)}
                          <TransactionTypeBadge type={tx.transaction_type} size="sm" />
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
                      <TableCell className="text-sm">
                        {getUserName(tx.user_id)}
                      </TableCell>
                      <TableCell>
                        <SyncStatusIndicator
                          status={tx.sync_status as SyncStatus}
                          size="sm"
                          showLabel={false}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {transactions.length > 10 && (
            <div className="mt-4 text-center">
              <p className="text-sm text-foreground-muted">
                Showing 10 of {transactions.length} transactions
              </p>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Archive Confirmation Modal */}
      <Modal
        isOpen={archiveModalOpen}
        onClose={() => setArchiveModalOpen(false)}
        size="sm"
      >
        <ModalHeader showCloseButton onClose={() => setArchiveModalOpen(false)}>
          {item.is_archived ? "Restore Item" : "Archive Item"}
        </ModalHeader>
        <ModalBody>
          <div className="text-center">
            <div className={`w-16 h-16 ${item.is_archived ? "bg-primary-50" : "bg-warning-50"} rounded-full flex items-center justify-center mx-auto mb-4`}>
              {item.is_archived ? (
                <RotateCcw className="w-8 h-8 text-primary" />
              ) : (
                <AlertCircle className="w-8 h-8 text-warning" />
              )}
            </div>
            <p className="text-foreground mb-2">
              {item.is_archived ? (
                <>Are you sure you want to restore <strong>{item.name}</strong>?</>
              ) : (
                <>Are you sure you want to archive <strong>{item.name}</strong>?</>
              )}
            </p>
            <p className="text-sm text-foreground-muted">
              {item.is_archived
                ? "The item will be active and visible again."
                : "The item will be hidden but can be restored later."}
            </p>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setArchiveModalOpen(false)}>
            Cancel
          </Button>
          <Button
            variant={item.is_archived ? "primary" : "danger"}
            onClick={handleArchiveToggle}
            isLoading={isArchiving}
            disabled={isArchiving}
          >
            {item.is_archived ? "Restore" : "Archive"}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
