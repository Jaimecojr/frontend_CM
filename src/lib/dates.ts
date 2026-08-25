export function getTodayString(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${dd}`;
}

// Regla de negocio: la vigencia de un afiliado dura "1 año, inclusive" — igual que
// renovar un seguro o una membresía, el período va desde el día de inicio hasta el
// día ANTERIOR al aniversario siguiente (ej. 20/08/2026 → 19/08/2027, no 20/08/2027).
// Por eso, tras sumar el año, se resta 1 día.
//
// Parseamos el string manualmente a componentes numéricos y usamos el constructor
// `new Date(year, month, day)` (que interpreta esos componentes como hora LOCAL) en
// vez de `new Date(dateString)` (que interpreta un string de fecha sin hora como
// medianoche UTC). Toda la aritmética (suma de año, resta de día, lectura final de
// componentes) se hace siempre con getters/setters LOCALES (getFullYear/getMonth/
// getDate/setFullYear/setDate) — nunca con `Date.UTC` ni parseo de string ISO — para
// que el resultado sea idéntico sin importar la timezone del navegador.
//
// `setDate(fecha.getDate() - 1)` cuando el día actual es 1 retrocede automáticamente
// al último día del mes anterior; esto resuelve correctamente el caso de un 29 de
// febrero bisiesto cuyo aniversario cae en un año no bisiesto: JS normaliza el 29-feb
// inexistente a 1-mar, y luego el -1 día lo deja en 28-feb (último día de febrero).
export function addOneYear(dateString: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);
  if (!match) return "";
  const [, y, m, d] = match;
  const fecha = new Date(Number(y), Number(m) - 1, Number(d));
  fecha.setFullYear(fecha.getFullYear() + 1);
  fecha.setDate(fecha.getDate() - 1);
  const mm = String(fecha.getMonth() + 1).padStart(2, "0");
  const dd = String(fecha.getDate()).padStart(2, "0");
  return `${fecha.getFullYear()}-${mm}-${dd}`;
}
