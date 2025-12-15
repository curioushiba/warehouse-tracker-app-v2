import type { ReactNode } from "react";
import Link from "next/link";
import {
  Package,
  AlertTriangle,
  AlertCircle,
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Clock,
  Eye,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Badge,
  Progress,
  Avatar,
} from "@/components/ui";
import {
  StockLevelBadge,
  TransactionTypeBadge,
} from "@/components/ui";
import { getDashboardData, getRecentActivity } from "@/lib/actions";
import type { Item, Alert as AlertType } from "@/lib/supabase/types";
import { formatRelativeTime, getStockLevel } from "@/lib/utils";

// Stat Card Component
interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: ReactNode;
  iconColor: string;
  href?: string;
}

const StatCard = ({
  title,
  value,
  change,
  changeLabel,
  icon,
  iconColor,
  href,
}: StatCardProps) => {
  const content = (
    <Card
      variant="elevated"
      size="md"
      isHoverable={!!href}
      className="relative overflow-hidden"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-foreground-muted mb-1">{title}</p>
          <p className="text-2xl font-heading font-semibold text-foreground">{value}</p>
          {change !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              {change >= 0 ? (
                <TrendingUp className="w-4 h-4 text-success" />
              ) : (
                <TrendingDown className="w-4 h-4 text-error" />
              )}
              <span
                className={`text-sm font-medium ${
                  change >= 0 ? "text-success" : "text-error"
                }`}
              >
                {change >= 0 ? "+" : ""}
                {change}%
              </span>
              {changeLabel && (
                <span className="text-sm text-foreground-muted">{changeLabel}</span>
              )}
            </div>
          )}
        </div>
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconColor}`}
        >
          {icon}
        </div>
      </div>
      {href && (
        <div className="absolute bottom-4 right-4">
          <ChevronRight className="w-5 h-5 text-foreground-muted" />
        </div>
      )}
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
};

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
        <StatCard
          title="Total Items"
          value={Intl.NumberFormat("en-US").format(stats?.totalItems ?? 0)}
          icon={<Package className="w-6 h-6 text-white" />}
          iconColor="bg-primary"
          href="/admin/items"
        />
        <StatCard
          title="Low Stock Items"
          value={stats?.lowStockItems ?? 0}
          icon={<AlertTriangle className="w-6 h-6 text-white" />}
          iconColor="bg-warning"
          href="/admin/items?filter=low_stock"
        />
        <StatCard
          title="Critical Stock"
          value={stats?.criticalStockItems ?? 0}
          icon={<AlertCircle className="w-6 h-6 text-white" />}
          iconColor="bg-error"
          href="/admin/items?filter=critical"
        />
        <StatCard
          title="Today's Transactions"
          value={stats?.todayTransactions ?? 0}
          icon={<ArrowLeftRight className="w-6 h-6 text-white" />}
          iconColor="bg-info"
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

      {/* Low Stock Items */}
      <Card variant="elevated" size="md">
        <CardHeader
          title="Items Needing Attention"
          subtitle="Low and critical stock levels"
          action={
            <Link href="/admin/items?filter=low_stock">
              <Button variant="outline" size="sm">
                View All
              </Button>
            </Link>
          }
          hasBorder
        />
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50 border-b border-border">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-foreground-muted uppercase tracking-wider">
                    Item
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-foreground-muted uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-foreground-muted uppercase tracking-wider">
                    Stock Level
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-foreground-muted uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-foreground-muted uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
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
                        className="hover:bg-neutral-50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-foreground">{item.name}</p>
                            <p className="text-sm text-foreground-muted">{item.sku}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-foreground-muted">
                          {item.category_id ?? "—"}
                        </td>
                        <td className="px-6 py-4">
                          <div className="w-32">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium">
                                {item.current_stock} / {maxStock}
                              </span>
                            </div>
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
                              aria-label={`Stock level: ${percentage}%`}
                            />
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <StockLevelBadge level={level} size="sm" />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link href={`/admin/items/${item.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </Link>
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
