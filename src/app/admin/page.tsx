import Link from "next/link";
import {
  Package,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Clock,
  Eye,
  ArrowLeftRight,
  CornerUpRight,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Badge,
  Progress,
  Avatar,
  StatCardWarm,
  StockLevelBadge,
  TransactionTypeBadge,
} from "@/components/ui";
import { getDashboardData, getRecentActivity } from "@/lib/actions";
import type { Item, Alert as AlertType } from "@/lib/supabase/types";
import { formatRelativeTime, getStockLevel } from "@/lib/utils";

// Transaction type for recent activity
interface RecentTransaction {
  id: string;
  transaction_type: string;
  quantity: number;
  server_timestamp: string;
  item: { name: string; sku: string } | null;
  user: { first_name: string; last_name: string } | null;
}

// Dashboard stats type (page-local; matches dashboard action payload)
interface DashboardStats {
  totalItems: number;
  lowStockItems: number;
  criticalStockItems: number;
  todayTransactions: number;
  pendingSync: number;
  recentAlerts: AlertType[];
}

export default async function AdminDashboard() {
  const [dashboardResult, activityResult] = await Promise.all([
    getDashboardData(),
    getRecentActivity(5),
  ]);

  if (!dashboardResult.success || !dashboardResult.data) {
    return (
      <Card variant="elevated" size="md" className="text-center py-12">
        <AlertCircle className="w-12 h-12 mx-auto text-error mb-4" />
        <p className="text-foreground font-medium mb-2">Failed to load dashboard</p>
        <p className="text-foreground-muted text-sm">
          {dashboardResult.error || "Failed to fetch dashboard stats"}
        </p>
        <Link href="/admin">
          <Button variant="outline" size="sm" className="mt-4">
            Retry
          </Button>
        </Link>
      </Card>
    );
  }

  const stats = dashboardResult.data.stats as DashboardStats;
  const lowStockItemsList = (dashboardResult.data.lowStockItemsList ?? []) as Item[];
  const recentTransactions: RecentTransaction[] =
    activityResult.success && activityResult.data
      ? (activityResult.data as RecentTransaction[])
      : [];

  const unreadAlerts = stats?.recentAlerts ?? [];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCardWarm
          label="Total Items"
          value={stats?.totalItems ?? 0}
          subtitle="in inventory"
          icon="package"
          accentColor="emerald"
          href="/admin/items"
        />
        <StatCardWarm
          label="Low Stock Items"
          value={stats?.lowStockItems ?? 0}
          subtitle="need attention"
          icon="alert-triangle"
          accentColor="amber"
          href="/admin/items?filter=low_stock"
        />
        <StatCardWarm
          label="Critical Stock"
          value={stats?.criticalStockItems ?? 0}
          subtitle="urgent"
          icon="alert-circle"
          accentColor="rose"
          href="/admin/items?filter=critical"
        />
        <StatCardWarm
          label="Today's Transactions"
          value={stats?.todayTransactions ?? 0}
          subtitle="today"
          icon="arrow-left-right"
          accentColor="blue"
          href="/admin/transactions"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions */}
        <div className="lg:col-span-2">
          <Card variant="elevated" size="md">
            <CardHeader
              title="Recent Transactions"
              subtitle="Latest inventory movements"
              action={
                <Link href="/admin/transactions">
                  <Button
                    variant="ghost"
                    size="sm"
                    rightIcon={<ChevronRight className="w-4 h-4" />}
                  >
                    View All
                  </Button>
                </Link>
              }
              hasBorder
            />
            <CardBody className="p-0">
              <div className="divide-y divide-border">
                {recentTransactions.length === 0 ? (
                  <div className="px-6 py-8 text-center text-foreground-muted">
                    No recent transactions
                  </div>
                ) : (
                  recentTransactions.map((transaction) => {
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
                              {formatRelativeTime(transaction.server_timestamp)}
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
        </div>

        {/* Alerts */}
        <div>
          <Card variant="elevated" size="md">
            <CardHeader
              title="Alerts"
              subtitle={`${unreadAlerts.length} unread`}
              action={
                <Badge colorScheme="error" size="sm">
                  {unreadAlerts.length}
                </Badge>
              }
              hasBorder
            />
            <CardBody className="p-0">
              <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
                {unreadAlerts.length === 0 ? (
                  <div className="px-4 py-8 text-center text-foreground-muted">
                    No unread alerts
                  </div>
                ) : (
                  unreadAlerts.slice(0, 5).map((alert) => (
                    <div
                      key={alert.id}
                      className="px-4 py-3 hover:bg-neutral-50 transition-colors bg-primary-50/50"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-2 h-2 rounded-full mt-2 ${
                            alert.severity === "critical" ||
                            alert.severity === "error"
                              ? "bg-error"
                              : alert.severity === "warning"
                              ? "bg-warning"
                              : alert.severity === "info"
                              ? "bg-info"
                              : "bg-neutral-400"
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">
                            {alert.title}
                          </p>
                          <p className="text-xs text-foreground-muted mt-0.5 line-clamp-2">
                            {alert.message}
                          </p>
                          <p className="text-xs text-foreground-placeholder mt-1">
                            {formatRelativeTime(alert.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="p-4 border-t border-border">
                <Link href="/admin/notifications">
                  <Button variant="ghost" size="sm" isFullWidth>
                    View All Alerts
                  </Button>
                </Link>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Low Stock Items - Warm Design */}
      <Card variant="elevated" size="md" className="bg-white">
        <CardHeader
          title={
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="font-heading font-semibold text-lg text-foreground">
                Items Needing Attention
              </span>
            </div>
          }
          subtitle={`${lowStockItemsList.length} items below threshold`}
          action={
            <Link href="/admin/items?filter=low_stock">
              <Button
                size="sm"
                className="bg-cta hover:bg-cta-hover text-foreground rounded-full px-5"
              >
                View All
              </Button>
            </Link>
          }
          hasBorder
          className="border-border-secondary"
        />
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border-secondary">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-secondary-800">
                    Item
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-secondary-800">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-secondary-800">
                    Stock Level
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-secondary-800">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-medium text-secondary-800">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-secondary">
                {lowStockItemsList.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-8 text-center text-foreground-muted"
                    >
                      No low stock items
                    </td>
                  </tr>
                ) : (
                  lowStockItemsList.slice(0, 5).map((item) => {
                    const minStock = item.min_stock ?? 0;
                    const maxStock = item.max_stock ?? 100;
                    const level = getStockLevel(
                      item.current_stock,
                      minStock,
                      maxStock
                    );
                    const percentage =
                      maxStock > 0 ? (item.current_stock / maxStock) * 100 : 0;

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-foreground/[0.02] transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-foreground">{item.name}</p>
                            <p className="text-sm text-secondary-700">{item.sku}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-foreground-muted">
                          {item.category_id ? item.category_id : (
                            <span className="text-secondary-600 italic">Uncategorized</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Progress
                              value={percentage}
                              colorScheme={
                                level === "critical"
                                  ? "error"
                                  : level === "low"
                                  ? "warning"
                                  : "success"
                              }
                              size="sm"
                              className="w-24"
                              aria-label={`Stock level: ${percentage}%`}
                            />
                            <span className="text-sm font-medium text-foreground whitespace-nowrap">
                              {item.current_stock} / {maxStock}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <StockLevelBadge level={level} size="sm" />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <Link href={`/admin/items/${item.id}`}>
                              <Button variant="ghost" size="sm" className="text-secondary-700 hover:text-foreground">
                                <Eye className="w-4 h-4" />
                              </Button>
                            </Link>
                            <Link href={`/admin/items/${item.id}`}>
                              <Button variant="ghost" size="sm" className="text-secondary-700 hover:text-foreground">
                                <CornerUpRight className="w-4 h-4" />
                              </Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/admin/items/new">
          <Card
            variant="outline"
            size="sm"
            isHoverable
            className="text-center"
          >
            <CardBody>
              <Package className="w-8 h-8 mx-auto text-primary mb-2" />
              <p className="font-medium">Add New Item</p>
            </CardBody>
          </Card>
        </Link>
        <Link href="/admin/stock-takes/new">
          <Card
            variant="outline"
            size="sm"
            isHoverable
            className="text-center"
          >
            <CardBody>
              <Clock className="w-8 h-8 mx-auto text-primary mb-2" />
              <p className="font-medium">Start Stock Take</p>
            </CardBody>
          </Card>
        </Link>
        <Link href="/admin/transactions/new">
          <Card
            variant="outline"
            size="sm"
            isHoverable
            className="text-center"
          >
            <CardBody>
              <ArrowLeftRight className="w-8 h-8 mx-auto text-primary mb-2" />
              <p className="font-medium">New Transaction</p>
            </CardBody>
          </Card>
        </Link>
        <Link href="/admin/reports">
          <Card
            variant="outline"
            size="sm"
            isHoverable
            className="text-center"
          >
            <CardBody>
              <TrendingUp className="w-8 h-8 mx-auto text-primary mb-2" />
              <p className="font-medium">View Reports</p>
            </CardBody>
          </Card>
        </Link>
      </div>
    </div>
  );
}
