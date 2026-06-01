import { Skeleton } from '@/components/ui/skeleton';

export function TodayAppointmentsCardSkeleton() {
  return (
    <div className="rounded-[10px] bg-white px-7.5 py-6 shadow-1 dark:bg-gray-dark dark:shadow-card flex flex-col gap-1">
      <Skeleton className="mb-2 h-6 w-48" />
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-3 border-b border-stroke py-3.5 dark:border-dark-3 last:border-b-0">
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-44" />
          </div>
          <Skeleton className="h-7 w-7 rounded-full" />
        </div>
      ))}
    </div>
  );
}
