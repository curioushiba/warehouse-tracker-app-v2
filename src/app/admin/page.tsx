import Link from "next/link";
import {
  Package,
  AlertCircle,
  TrendingUp,
  Clock,
  ArrowLeftRight,
  type LucideIcon,
} from "lucide-react";
import {
  Card,
  CardBody,
  Button,
} from "@/components/ui";
import { RecentTransactionsPanel } from "@/components/dashboard";
import { getDashboardData, getRecentActivity } from "@/lib/actions";
import type { RecentTransaction } from "@/components/dashboard/RecentTransactionsPanel";
import { DashboardClient } from "./DashboardClient";

// Force dynamic rendering to prevent stale data from static generation
export const dynamic = "force-dynamic";

interface QuickAction {
  href: string;
  icon: LucideIcon;
  label: string;
}

const quickActions: QuickAction[] = [
  { href: "/admin/items/new", icon: Package, label: "Add New Item" },
  { href: "/admin/stock-takes/new", icon: Clock, label: "Start Stock Take" },
  { href: "/admin/transactions/new", icon: ArrowLeftRight, label: "New Transaction" },
  { href: "/admin/reports", icon: TrendingUp, label: "View Reports" },
];

export default async function AdminDashboard() {
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

  const { stats } = dashboardResult.data;
  const recentTransactions: RecentTransaction[] =
    activityResult.success && activityResult.data
      ? (activityResult.data as RecentTransaction[])
      : [];

  return (
    <div className="space-y-6">
      {/* Expandable Stats Grid */}
      <DashboardClient
        stats={{
          totalItems: stats.totalItems,
          lowStockItems: stats.lowStockItems,
          criticalStockItems: stats.criticalStockItems,
          todayTransactions: stats.todayTransactions,
        }}
      />

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {quickActions.map(({ href, icon: Icon, label }) => (
          <Link key={href} href={href}>
            <Card variant="elevated" size="sm" isHoverable className="text-center">
              <CardBody>
                <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center mx-auto mb-3">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <p className="font-heading font-medium">{label}</p>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent Transactions */}
      <RecentTransactionsPanel initialData={recentTransactions} />
    </div>
  );
}
