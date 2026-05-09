import { Skeleton } from "@/components/ui/skeleton";

interface ListSkeletonProps {
  count?: number;
}

export function ListSkeleton({ count = 6 }: ListSkeletonProps) {
  return (
    <div className="space-y-2" aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-lg bg-card px-3 py-3 shadow-card"
        >
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
