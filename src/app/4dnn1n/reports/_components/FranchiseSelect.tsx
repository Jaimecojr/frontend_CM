"use client";

import type { FranchiseOption } from "../_lib/catalogs";

/**
 * Presentational "Franquicia" filter shared by every report page that
 * offers it. Left un-gated by role here (each page wraps it in
 * `{isSuperAdmin && <FranchiseSelect ... />}`) so this component only
 * needs to know how to render options, not who's allowed to see it.
 */
export function FranchiseSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: FranchiseOption[];
}) {
  return (
    <select
      title="Filtrar por Franquicia"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 w-full sm:w-auto shrink-0 rounded-lg border-[1.5px] border-stroke bg-transparent px-3 text-sm text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
    >
      <option value="">Franquicia (Todas)</option>
      {options.map((f) => (
        <option key={f.id} value={f.id}>
          {f.name}
        </option>
      ))}
    </select>
  );
}
