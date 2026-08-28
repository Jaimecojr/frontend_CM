export function getTodayString(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${dd}`;
}

/**
 * Business rule: an affiliate's validity lasts "1 year, inclusive" — the period runs
 * from the start day to the day BEFORE the next anniversary (e.g. 20/08/2026 →
 * 19/08/2027, not 20/08/2027), hence the -1 day after adding the year.
 *
 * Parses the string manually and builds the date with `new Date(year, month, day)`
 * (interpreted as LOCAL time), never with `new Date(dateString)` or `Date.UTC` — a
 * date-only string parsed the latter way is UTC midnight, which can shift a day in
 * timezones behind UTC. All arithmetic uses local getters/setters for that reason.
 */
export function addOneYear(dateString: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);
  if (!match) return "";
  const [, y, m, d] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  date.setFullYear(date.getFullYear() + 1);
  // If the anniversary is Feb 29 on a non-leap year, JS already normalized it to
  // Mar 1 above; subtracting 1 day here lands correctly on Feb 28.
  date.setDate(date.getDate() - 1);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${mm}-${dd}`;
}
