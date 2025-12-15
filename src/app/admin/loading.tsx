import { Card, CardBody, Skeleton } from "@/components/ui";

export default function AdminDashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Page Header Skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-28" />
        </div>
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} variant="elevated">
            <CardBody className="p-4">
              <div className="flex items-center justify-between mb-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
              <Skeleton className="h-8 w-20 mb-1" />
              <Skeleton className="h-3 w-16" />
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Charts Row Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card variant="elevated">
          <CardBody className="p-4">
            <Skeleton className="h-6 w-40 mb-4" />
            <Skeleton className="h-64 w-full rounded-lg" />
          </CardBody>
        </Card>
        <Card variant="elevated">
          <CardBody className="p-4">
            <Skeleton className="h-6 w-32 mb-4" />
            <Skeleton className="h-64 w-full rounded-lg" />
          </CardBody>
        </Card>
      </div>

      {/* Recent Activity Skeleton */}
      <Card variant="elevated">
        <CardBody className="p-4">
          <Skeleton className="h-6 w-36 mb-4" />
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
