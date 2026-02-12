import { Skeleton } from "@/components/ui";

export default function FrozenGoodsLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-full" borderRadius="lg" />
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-40" />
        </div>
      </div>
      <Skeleton className="h-96 w-full" borderRadius="lg" />
    </div>
  );
}
