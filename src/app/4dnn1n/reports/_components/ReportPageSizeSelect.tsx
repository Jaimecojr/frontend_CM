"use client";

const OPTIONS = ["25", "50", "100", "all"] as const;

/**
 * Page-size control shared by every paginated report table. Kept separate
 * from the generic DataTable page-size UI because reports must support the
 * literal string "all" (backend contract: per_page=all returns everything
 * unpaginated), not just numeric sizes.
 */
export function ReportPageSizeSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (size: string) => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <span className="text-xs text-neutral-500 dark:text-neutral-400">Ver</span>
      <select
        title="Registros por página"
        className="h-9 rounded-lg border-[1.5px] border-stroke bg-transparent px-2 text-sm text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {OPTIONS.map((o) => (
          <option key={o} value={o}>
            {o === "all" ? "Todos" : o}
          </option>
        ))}
      </select>
    </div>
  );
}
