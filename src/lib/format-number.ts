export function compactFormat(value: number) {
  const formatter = new Intl.NumberFormat("en", {
    notation: "compact",
    compactDisplay: "short",
  });

  return formatter.format(value);
}

export function standardFormat(value: number) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Formats an integer with "." as the thousands separator (Colombian style), e.g. 52383 -> "52.383".
 * Done by hand instead of `toLocaleString("es-CO")` so the output never depends on the runtime's
 * locale data (the plain `es` locale, for one, skips the separator on 4-digit numbers), which
 * matters for an amount input that is re-formatted on every keystroke.
 */
export function formatThousands(value: number): string {
  return String(Math.trunc(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
