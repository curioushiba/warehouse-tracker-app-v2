import { Card, CardHeader, CardBody, Skeleton } from "@/components/ui";

export default function ItemDetailLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-24" />
          <div>
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-4 w-32 mt-2" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-28" />
        </div>
      </div>

      {/* Item details skeleton */}
      <Card variant="elevated">
        <CardBody className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            <Skeleton className="w-24 h-24 rounded-2xl" />
            <div className="flex-1">
              <div className="space-y-2">
                <Skeleton className="h-6 w-56" />
                <Skeleton className="h-4 w-40" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Metadata cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} variant="elevated">
            <CardBody className="p-4">
              <Skeleton className="h-12 w-full" />
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Manage codes skeleton */}
      <Card variant="elevated">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardBody className="pt-4 space-y-4">
          <Skeleton className="h-40 w-full" />
        </CardBody>
      </Card>

      {/* Transactions skeleton */}
      <Card variant="elevated">
        <CardHeader className="p-6 pb-0">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardBody className="p-6 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </CardBody>
      </Card>
    </div>
  );
}


