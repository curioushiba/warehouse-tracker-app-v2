import { Card, CardBody, Skeleton } from "@/components/ui";

export default function TransactionsLoading() {
  return (
    <div className="space-y-6">
      {/* Page Header Skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>

      {/* Filters Skeleton */}
      <Card variant="elevated">
        <CardBody className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2">
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-20" />
          </div>
          <div className="flex gap-4 mt-4">
            <Skeleton className="h-10 w-64" />
          </div>
        </CardBody>
      </Card>

      {/* Table Skeleton */}
      <Card variant="elevated">
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <div className="p-4 space-y-3">
              {/* Header */}
              <div className="flex gap-4 pb-3 border-b border-neutral-100">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
              {/* Rows */}
              {[...Array(10)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 py-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-6 w-20" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
