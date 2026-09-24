/**
 * Builds the query string every report's fetch and export call shares.
 * Centralized so filter-skipping rules (undefined/empty means "not set",
 * never a literal empty param) stay identical between a report's list
 * fetch and its export link — divergence there would make the exported
 * file silently not match what's on screen.
 */
export function toQueryString(params: Record<string, string | number | undefined>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    qs.set(key, String(value));
  }
  const serialized = qs.toString();
  return serialized ? `?${serialized}` : "";
}
