"use client";

import * as React from "react";
import {
  TrendingUp,
  BarChart3,
  AlertTriangle,
  Package,
  Users,
  Clock,
} from "lucide-react";
import {
  Card,
  CardBody,
  CardHeader,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
  Skeleton,
  Alert,
} from "@/components/ui";
import {
  getCommissaryAnalytics,
  type CommissaryAnalyticsData,
  type PerItemAnalytics,
  type PerUserAnalytics,
  type StockDaysItem,
} from "@/lib/actions/commissary";
import { cn } from "@/lib/utils";

export default function CommissaryAnalyticsPage() {
  const [data, setData] = React.useState<CommissaryAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchData = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await getCommissaryAnalytics();

      if (!result.success) {
        setError(result.error || "Failed to load analytics data");
        return;
      }

      setData(result.data);
    } catch {
      setError("An unexpected error occurred while loading analytics");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Pre-sort data for tables
  const sortedItemBreakdown = React.useMemo<PerItemAnalytics[]>(() => {
    if (!data) return [];
    return [...data.perItemBreakdown].sort(
      (a, b) => b.producedThisWeek - a.producedThisWeek
    );
  }, [data]);

  const sortedUserBreakdown = React.useMemo<PerUserAnalytics[]>(() => {
    if (!data) return [];
    return [...data.perUserBreakdown].sort(
      (a, b) => b.totalProduced - a.totalProduced
    );
  }, [data]);

  const sortedStockDays = React.useMemo<StockDaysItem[]>(() => {
    if (!data) return [];
    return [...data.stockDaysRemaining].sort((a, b) => {
      // null daysRemaining goes last
      if (a.daysRemaining === null && b.daysRemaining === null) return 0;
      if (a.daysRemaining === null) return 1;
      if (b.daysRemaining === null) return -1;
      return a.daysRemaining - b.daysRemaining;
    });
  }, [data]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">
          Production Analytics
        </h1>
        <p className="text-foreground-muted text-sm mt-1">
          Weekly production overview and breakdowns
        </p>
      </div>

      {/* Error State */}
      {error && (
        <Alert status="error" variant="subtle">
          {error}
        </Alert>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Produced This Week */}
        <Card variant="elevated" size="md">
          <CardBody>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-foreground-muted">
                  Produced This Week
                </p>
                {isLoading ? (
                  <Skeleton className="h-8 w-24 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {(data?.producedThisWeek ?? 0).toLocaleString()}
                  </p>
                )}
                <p className="text-xs text-foreground-muted mt-1">
                  total units
                </p>
              </div>
              <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-primary" />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Avg Daily Production */}
        <Card variant="elevated" size="md">
          <CardBody>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-foreground-muted">
                  Avg Daily Production
                </p>
                {isLoading ? (
                  <Skeleton className="h-8 w-24 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {(data?.avgDailyProduction ?? 0).toFixed(1)}
                  </p>
                )}
                <p className="text-xs text-foreground-muted mt-1">units/day</p>
              </div>
              <div className="w-10 h-10 bg-info-light rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-info" />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Waste Rate */}
        <Card variant="elevated" size="md">
          <CardBody>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-foreground-muted">Waste Rate</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-24 mt-1" />
                ) : (
                  <p
                    className={cn(
                      "text-2xl font-bold mt-1",
                      (data?.wastePercent ?? 0) > 10
                        ? "text-error"
                        : "text-foreground"
                    )}
                  >
                    {data?.wastePercent ?? 0}%
                  </p>
                )}
                <p className="text-xs text-foreground-muted mt-1">
                  of total production
                </p>
              </div>
              <div
                className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center",
                  !isLoading && (data?.wastePercent ?? 0) > 10
                    ? "bg-error-light"
                    : "bg-warning-light"
                )}
              >
                <AlertTriangle
                  className={cn(
                    "w-5 h-5",
                    !isLoading && (data?.wastePercent ?? 0) > 10
                      ? "text-error"
                      : "text-warning-dark"
                  )}
                />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Target Completion */}
        <Card variant="elevated" size="md">
          <CardBody>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-foreground-muted">
                  Target Completion
                </p>
                {isLoading ? (
                  <Skeleton className="h-8 w-24 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {data?.targetCompletionRate ?? 0}%
                  </p>
                )}
                <p className="text-xs text-foreground-muted mt-1">
                  targets met today
                </p>
              </div>
              <div className="w-10 h-10 bg-success-light rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-success" />
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Per-Item Breakdown */}
      <Card variant="elevated" className="overflow-hidden">
        <CardHeader
          title={
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Per-Item Breakdown
            </div>
          }
          subtitle="Production performance by item this week"
        />
        <CardBody className="p-0">
          <Table variant="simple" size="md">
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Produced This Week</TableHead>
                <TableHead className="text-right">Avg Daily</TableHead>
                <TableHead className="text-right">Waste Qty</TableHead>
                <TableHead className="text-right">Target Hit Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : sortedItemBreakdown.length === 0 ? (
                <TableEmpty
                  title="No production data"
                  description="No items have been produced this week"
                  icon={<Package className="w-12 h-12" />}
                  colSpan={5}
                />
              ) : (
                sortedItemBreakdown.map((item) => (
                  <TableRow key={item.itemId}>
                    <TableCell>
                      <div>
                        <span className="font-medium text-foreground">
                          {item.itemName}
                        </span>
                        <span className="text-xs text-foreground-muted ml-2">
                          {item.itemSku}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {item.producedThisWeek.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.avgDaily.toFixed(1)}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.wasteQuantity.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        colorScheme={
                          item.targetHitRate >= 80
                            ? "success"
                            : item.targetHitRate >= 50
                              ? "warning"
                              : "error"
                        }
                        variant="subtle"
                        size="sm"
                      >
                        {item.targetHitRate}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      {/* Per-User Breakdown */}
      <Card variant="elevated" className="overflow-hidden">
        <CardHeader
          title={
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Per-User Breakdown
            </div>
          }
          subtitle="Production performance by user this week"
        />
        <CardBody className="p-0">
          <Table variant="simple" size="md">
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead className="text-right">Total Produced</TableHead>
                <TableHead className="text-right">Items Count</TableHead>
                <TableHead className="text-right">Waste %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 4 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : sortedUserBreakdown.length === 0 ? (
                <TableEmpty
                  title="No user data"
                  description="No production activity recorded this week"
                  icon={<Users className="w-12 h-12" />}
                  colSpan={4}
                />
              ) : (
                sortedUserBreakdown.map((user) => (
                  <TableRow key={user.userId}>
                    <TableCell>
                      <span className="font-medium text-foreground">
                        {user.userName}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {user.totalProduced.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {user.itemsCount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={cn(
                          user.wastePercent > 10
                            ? "text-error font-semibold"
                            : "text-foreground-secondary"
                        )}
                      >
                        {user.wastePercent}%
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      {/* Stock Days Remaining */}
      <Card variant="elevated" className="overflow-hidden">
        <CardHeader
          title={
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Stock Days Remaining
            </div>
          }
          subtitle="Estimated days of stock remaining based on consumption rate"
        />
        <CardBody className="p-0">
          <Table variant="simple" size="md">
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Current Stock</TableHead>
                <TableHead className="text-right">
                  Daily Consumption
                </TableHead>
                <TableHead className="text-right">Days Remaining</TableHead>
                <TableHead>Unit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : sortedStockDays.length === 0 ? (
                <TableEmpty
                  title="No stock data"
                  description="No commissary items with consumption data available"
                  icon={<Clock className="w-12 h-12" />}
                  colSpan={5}
                />
              ) : (
                sortedStockDays.map((item) => (
                  <TableRow key={item.itemId}>
                    <TableCell>
                      <span className="font-medium text-foreground">
                        {item.itemName}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {item.currentStock.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.dailyConsumption.toFixed(1)}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.daysRemaining === null ? (
                        <Badge
                          colorScheme="neutral"
                          variant="subtle"
                          size="sm"
                        >
                          N/A
                        </Badge>
                      ) : (
                        <Badge
                          colorScheme={
                            item.daysRemaining <= 1
                              ? "error"
                              : item.daysRemaining <= 3
                                ? "warning"
                                : item.daysRemaining > 7
                                  ? "success"
                                  : "neutral"
                          }
                          variant="subtle"
                          size="sm"
                        >
                          {item.daysRemaining.toFixed(1)}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{item.unit}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardBody>
      </Card>
    </div>
  );
}
