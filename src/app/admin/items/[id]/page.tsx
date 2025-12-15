import Link from "next/link";
import {
  ArrowLeft,
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
  RotateCcw,
  Wrench,
  Trash2,
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
  Alert,
} from "@/components/ui";
import { StockLevelBadge, TransactionTypeBadge, SyncStatusIndicator } from "@/components/ui";
import { ItemImage } from "@/components/items";
import { getItemById } from "@/lib/actions/items";
import { getCategoryById } from "@/lib/actions/categories";
import { getLocationById } from "@/lib/actions/locations";
import { getTransactionsWithDetails, type TransactionWithDetails } from "@/lib/actions/transactions";
import type { TransactionType, SyncStatus } from "@/lib/supabase/types";
import { formatCurrency, formatDateTime, getStockLevel } from "@/lib/utils";
import { ItemDetailActions } from "./ItemDetailActions";
import { ManageCodesLazy } from "./ManageCodesLazy";

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

const getUserName = (tx: TransactionWithDetails) => {
  const user = tx.user;
  if (!user) return "Unknown";
  return user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.email || "Unknown";
};

export default async function ItemDetailPage({ params }: { params: { id: string } }) {
  const itemId = params.id;

  const itemResult = await getItemById(itemId);

  if (!itemResult.success) {
    return (
      <div className="space-y-6">
        <Link href="/admin/items">
          <Button variant="ghost" leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Back to Items
          </Button>
        </Link>
        <Alert status="error" variant="subtle">
          {itemResult.error || "Item not found"}
        </Alert>
      </div>
    );
  }

  const item = itemResult.data;

  const categoryPromise = item.category_id ? getCategoryById(item.category_id) : Promise.resolve(null);
  const locationPromise = item.location_id ? getLocationById(item.location_id) : Promise.resolve(null);
  const transactionsPromise = getTransactionsWithDetails({ itemId }, { limit: 11 });

  const [categoryResult, locationResult, transactionsResult] = await Promise.all([
    categoryPromise,
    locationPromise,
    transactionsPromise,
  ]);

  const category =
    categoryResult && categoryResult.success ? categoryResult.data : null;
  const location =
    locationResult && locationResult.success ? locationResult.data : null;
  const transactions = transactionsResult.success ? transactionsResult.data : [];

  const stockLevel = getStockLevel(item.current_stock, item.min_stock ?? 0, item.max_stock ?? 100);
  const displayTransactions = transactions.slice(0, 10);
  const hasMoreTransactions = transactions.length > 10;

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

        <ItemDetailActions itemId={item.id} itemName={item.name} isArchived={item.is_archived} />
      </div>

      {/* Item Details Card */}
      <Card variant="elevated">
        <CardBody className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Item Image/Icon */}
            <ItemImage
              imageUrl={item.image_url}
              itemName={item.name}
              size="xl"
              className="rounded-2xl"
            />

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

      {/* Manage Codes */}
      <ManageCodesLazy item={item} />

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
                {displayTransactions.length === 0 ? (
                  <TableEmpty
                    icon={<Clock className="w-12 h-12" />}
                    title="No transactions yet"
                    description="Transactions will appear here when stock is moved"
                    colSpan={7}
                  />
                ) : (
                  displayTransactions.map((tx) => (
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
                        {getUserName(tx)}
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

          {hasMoreTransactions && (
            <div className="mt-4 text-center">
              <p className="text-sm text-foreground-muted">
                Showing latest 10 transactions
              </p>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
