import Link from "next/link";
import {
  Package,
  AlertCircle,
  TrendingUp,
  Clock,
  Eye,
  ArrowLeftRight,
  CornerUpRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Progress,
  StockLevelBadge,
} from "@/components/ui";
import { RecentTransactionsPanel } from "@/components/dashboard";
import { getDashboardData, getRecentActivity } from "@/lib/actions";
import type { Item } from "@/lib/supabase/types";
import { getStockLevel } from "@/lib/utils";
import { DashboardClient } from "./DashboardClient";

// Force dynamic rendering to prevent stale data from static generation
export const dynamic = "force-dynamic";

// Transaction type for recent activity
interface RecentTransaction {
  id: string;
  transaction_type: string;
  quantity: number;
  event_timestamp: string;
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
}

// Sortable column types for low stock table
type SortColumn = "name" | "category" | "stock" | "status";
type SortDirection = "asc" | "desc";

interface PageProps {
  searchParams: Promise<{ sort?: string; dir?: string }>;
}

// Sortable header component
function SortableHeader({
  column,
  label,
  currentSort,
  currentDir,
}: {
  column: SortColumn;
  label: string;
  currentSort: SortColumn | null;
  currentDir: SortDirection;
}) {
  const isActive = currentSort === column;
  const nextDir = isActive && currentDir === "asc" ? "desc" : "asc";

  return (
    <th className="px-6 py-3 text-left text-sm font-medium">
      <Link
        href={`/admin?sort=${column}&dir=${nextDir}`}
        className="inline-flex items-center gap-1.5 text-foreground hover:text-primary transition-colors group"
      >
        {label}
        <span className="text-foreground/40 group-hover:text-primary/60">
          {isActive ? (
            currentDir === "asc" ? (
              <ArrowUp className="w-3.5 h-3.5" />
            ) : (
              <ArrowDown className="w-3.5 h-3.5" />
            )
          ) : (
            <ArrowUpDown className="w-3.5 h-3.5" />
          )}
        </span>
      </Link>
    </th>
  );
}

export default async function AdminDashboard({ searchParams }: PageProps) {
  const params = await searchParams;
  const sortColumn = (params.sort as SortColumn) || null;
  const sortDir = (params.dir as SortDirection) || "asc";

  const [dashboardResult, activityResult] = await Promise.all([
    getDashboardData(),
    getRecentActivity(5),
  ]);

  if (!dashboardResult.success) {
    return (
      <Card variant="elevated" size="md" className="text-center py-12">
        <AlertCircle className="w-12 h-12 mx-auto text-error mb-4" />
        <p className="text-foreground font-medium mb-2">Failed to load dashboard</p>
        <p className="text-foreground-muted text-sm">
          {dashboardResult.error}
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
  const lowStockItemsRaw = (dashboardResult.data.lowStockItemsList ?? []) as Item[];
  const recentTransactions: RecentTransaction[] =
    activityResult.success && activityResult.data
      ? (activityResult.data as RecentTransaction[])
      : [];

  // Sort low stock items based on URL params
  const lowStockItemsList = [...lowStockItemsRaw].sort((a, b) => {
    if (!sortColumn) return 0;

    let comparison = 0;
    switch (sortColumn) {
      case "name":
        comparison = a.name.localeCompare(b.name);
        break;
      case "category":
        comparison = (a.category_id || "").localeCompare(b.category_id || "");
        break;
      case "stock":
        comparison = a.current_stock - b.current_stock;
        break;
      case "status": {
        const getStockPriority = (item: Item) => {
          const minStock = item.min_stock ?? 0;
          if (item.current_stock <= 0) return 0; // critical
          if (item.current_stock <= minStock) return 1; // low
          return 2; // normal
        };
        comparison = getStockPriority(a) - getStockPriority(b);
        break;
      }
    }

    return sortDir === "desc" ? -comparison : comparison;
  });

  return (
    <div className="space-y-6">
      {/* Expandable Stats Grid */}
      <DashboardClient
        stats={{
          totalItems: stats?.totalItems ?? 0,
          lowStockItems: stats?.lowStockItems ?? 0,
          criticalStockItems: stats?.criticalStockItems ?? 0,
          todayTransactions: stats?.todayTransactions ?? 0,
        }}
      />

      {/* Recent Transactions - Full Width */}
      <RecentTransactionsPanel initialData={recentTransactions} />

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
                  <SortableHeader
                    column="name"
                    label="Item"
                    currentSort={sortColumn}
                    currentDir={sortDir}
                  />
                  <SortableHeader
                    column="category"
                    label="Category"
                    currentSort={sortColumn}
                    currentDir={sortDir}
                  />
                  <SortableHeader
                    column="stock"
                    label="Stock Level"
                    currentSort={sortColumn}
                    currentDir={sortDir}
                  />
                  <SortableHeader
                    column="status"
                    label="Status"
                    currentSort={sortColumn}
                    currentDir={sortDir}
                  />
                  <th className="px-6 py-3 text-right text-sm font-medium text-foreground">
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
