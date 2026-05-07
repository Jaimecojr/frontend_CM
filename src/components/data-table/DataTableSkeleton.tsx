import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHead,
  TableRow,
} from "@/components/ui/table";

export function DataTableSkeleton({
  title = "Cargando...",
  rows = 8,
  cols = 5,
}: {
  title?: string;
  rows?: number;
  cols?: number;
}) {
  return (
    <div className="rounded-[10px] bg-white px-7.5 pb-4 pt-7.5 shadow-1 dark:bg-gray-dark dark:shadow-card">
      <h2 className="mb-4 text-body-2xlg font-bold text-dark dark:text-white">
        {title}
      </h2>

      <Skeleton className="h-10 w-full" />

      <div className="mt-3 rounded-md border border-neutral-200/60 dark:border-dark-3">
        <Table>
          <TableHeader>
            <TableRow className="border-none uppercase [&>th]:text-center">
              {Array.from({ length: cols }).map((_, i) => (
                <TableHead key={i} className={i === 0 ? "!text-left" : ""}>
                  <Skeleton className="h-4 w-24" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {Array.from({ length: rows }).map((_, r) => (
              <TableRow key={r}>
                <TableCell colSpan={100}>
                  <Skeleton className="h-8 w-full" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
