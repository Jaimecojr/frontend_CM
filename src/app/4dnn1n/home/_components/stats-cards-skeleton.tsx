import { Skeleton } from '@/components/ui/skeleton';

export function StatsCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="rounded-[10px] bg-white p-6 shadow-1 dark:bg-gray-dark dark:shadow-card">
          <Skeleton className="mb-3 h-4 w-28" />
          <Skeleton className="h-9 w-20" />
        </div>
      ))}
    </div>
  );
}
