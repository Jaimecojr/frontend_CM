"use client";

import DatePickerWithToday from "@/components/FormElements/DatePicker/DatePickerWithToday";

/**
 * Date-range filter pair (with an optional single-date mode) shared by every
 * report that offers one. `DatePickerWithToday` never emits an empty string
 * through user interaction once a value is set (no native "clear" affordance
 * with `allowInput` disabled), so this is the only way a report's date
 * filter(s) can be cleared — the "×" fires a single batched `onChange` that
 * drops every date key at once, avoiding an intermediate URL with only one
 * of the two keys removed.
 */
export function DateRangeFilter({
  from,
  to,
  onChange,
  hideTo = false,
}: {
  from: string;
  to: string;
  onChange: (updates: Record<string, string | undefined>) => void;
  /** Single-date mode (e.g. Sin Renovación, whose backend contract has no "to"). */
  hideTo?: boolean;
}) {
  const hasValue = hideTo ? Boolean(from) : Boolean(from || to);

  const clear = () => onChange(hideTo ? { from: undefined } : { from: undefined, to: undefined });

  return (
    <div className="relative shrink-0 flex items-center gap-1">
      <DatePickerWithToday
        value={from}
        onChange={(v) => onChange({ from: v || undefined })}
        placeholder={hideTo ? "Vencidos desde" : "Desde"}
        className="h-9 w-full sm:w-auto"
      />
      {!hideTo && (
        <DatePickerWithToday
          value={to}
          onChange={(v) => onChange({ to: v || undefined })}
          placeholder="Hasta"
          className="h-9 w-full sm:w-auto"
        />
      )}
      {hasValue && (
        <button
          type="button"
          onClick={clear}
          title="Limpiar fechas"
          className="h-9 w-9 flex items-center justify-center rounded-lg border border-stroke text-dark-5 hover:text-red-500 dark:border-dark-3 dark:text-dark-6"
        >
          ×
        </button>
      )}
    </div>
  );
}
