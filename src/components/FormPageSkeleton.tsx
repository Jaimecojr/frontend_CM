function FieldSkeleton() {
  return (
    <div className="space-y-2">
      <div className="h-4 w-28 animate-pulse rounded bg-gray-200 dark:bg-dark-3" />
      <div className="h-10 w-full animate-pulse rounded-lg bg-gray-200 dark:bg-dark-3" />
    </div>
  );
}

type Props = {
  fields?: number;
};

export function FormPageSkeleton({ fields = 8 }: Props) {
  return (
    <div className="rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card">
      <div className="flex items-center justify-between gap-4 border-b border-stroke px-4 py-4 dark:border-dark-3 sm:px-6 xl:px-7.5">
        <div className="space-y-2">
          <div className="h-5 w-36 animate-pulse rounded bg-gray-200 dark:bg-dark-3" />
          <div className="h-4 w-52 animate-pulse rounded bg-gray-200 dark:bg-dark-3" />
        </div>
        <div className="h-9 w-24 animate-pulse rounded-lg bg-gray-200 dark:bg-dark-3" />
      </div>
      <div className="p-4 sm:p-6 xl:p-10">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {Array.from({ length: fields }).map((_, i) => (
            <FieldSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
