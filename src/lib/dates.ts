export function getTodayString(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${dd}`;
}

// Business rule: an affiliate's validity lasts "1 year, inclusive" — just like
// renewing an insurance policy or a membership, the period runs from the start day
// to the day BEFORE the next anniversary (e.g. 20/08/2026 → 19/08/2027, not 20/08/2027).
// That's why, after adding the year, 1 day is subtracted.
//
// We manually parse the string into numeric components and use the
// `new Date(year, month, day)` constructor (which interprets those components as LOCAL
// time) instead of `new Date(dateString)` (which interprets a date string without a
// time as UTC midnight). All the arithmetic (adding the year, subtracting the day,
// reading the final components) is always done with LOCAL getters/setters
// (getFullYear/getMonth/getDate/setFullYear/setDate) — never with `Date.UTC` nor ISO
// string parsing — so the result is identical regardless of the browser's timezone.
//
// `setDate(date.getDate() - 1)` when the current day is 1 automatically rolls back
// to the last day of the previous month; this correctly resolves the case of a leap
// year's February 29 whose anniversary falls on a non-leap year: JS normalizes the
// nonexistent Feb 29 to Mar 1, and then the -1 day leaves it at Feb 28 (the last day
// of February).
export function addOneYear(dateString: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);
  if (!match) return "";
  const [, y, m, d] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  date.setFullYear(date.getFullYear() + 1);
  date.setDate(date.getDate() - 1);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${mm}-${dd}`;
}
