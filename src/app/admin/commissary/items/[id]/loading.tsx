import { Skeleton } from "@/components/ui";

export default function CommissaryItemDetailLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-8 w-48" />
      </div>
      <Skeleton className="h-64 w-full" borderRadius="lg" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Skeleton className="h-20 w-full" borderRadius="lg" />
        <Skeleton className="h-20 w-full" borderRadius="lg" />
        <Skeleton className="h-20 w-full" borderRadius="lg" />
      </div>
    </div>
  );
}
