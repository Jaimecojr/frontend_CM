/**
 * Renders a backend date/datetime string for a report table cell. Only the
 * first 10 characters are read so a full ISO timestamp (date + time) formats
 * the same as a plain "yyyy-mm-dd" — reports never need the time portion.
 */
export function formatDate(ymd: string | null | undefined): string {
  if (!ymd) return "-";
  const [year, month, day] = ymd.slice(0, 10).split("-");
  if (!year || !month || !day) return "-";
  return `${day}/${month}/${year}`;
}

/**
 * Renders a currency amount for a report table cell or totals card. Accepts
 * `number | string` because the backend sends money fields without a
 * decimal cast — they can arrive as either depending on the query.
 */
export function formatMoney(value: number | string | null | undefined): string {
  return `$ ${Number(value || 0).toLocaleString("es-CO")}`;
}
