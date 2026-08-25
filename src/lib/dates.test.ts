import { describe, expect, it } from "vitest";
import { addOneYear, getTodayString } from "./dates";

describe("getTodayString", () => {
  it("devuelve la fecha de hoy en formato YYYY-MM-DD", () => {
    const hoy = new Date();
    const esperado = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
    expect(getTodayString()).toBe(esperado);
  });
});

describe("addOneYear", () => {
  it("suma un año y resta un día (vigencia de 1 año, inclusive)", () => {
    expect(addOneYear("2026-03-15")).toBe("2027-03-14");
  });

  it("aplica la regla de -1 día también cuando el aniversario cae en un 29 de febrero inexistente (año no bisiesto), normalizando correctamente al último día de febrero", () => {
    expect(addOneYear("2024-02-29")).toBe("2025-02-28");
  });

  it("devuelve cadena vacía si el string de fecha está vacío", () => {
    expect(addOneYear("")).toBe("");
  });

  it("devuelve cadena vacía si la fecha es inválida", () => {
    expect(addOneYear("no-es-una-fecha")).toBe("");
  });
});
