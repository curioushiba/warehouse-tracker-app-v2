import { Skeleton, SkeletonText } from "@/components/ui";

export default function CommissaryLoading() {
  return (
    <div className="space-y-6">
      {/* Stat cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-background rounded-xl border border-border p-5">
            <Skeleton className="h-4 w-24 mb-3" />
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>

      {/* Progress skeleton */}
      <div className="bg-background rounded-xl border border-border p-5">
        <Skeleton className="h-5 w-48 mb-4" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-3 w-32" />
      </div>

      {/* Priority items skeleton */}
      <div className="bg-background rounded-xl border border-border p-5">
        <Skeleton className="h-5 w-32 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-6 w-20" />
              </div>
              <Skeleton className="h-3 w-full mb-2" />
              <SkeletonText lines={1} className="w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
