import { describe, expect, it } from "vitest";
import { formatCityName } from "@/lib/format-city-name";

describe("formatCityName", () => {
  it("convierte un nombre en mayúsculas sostenidas a solo la primera letra en mayúscula", () => {
    expect(formatCityName("BOGOTA")).toBe("Bogota");
  });

  it("con varias palabras, solo capitaliza la primera letra del nombre completo", () => {
    expect(formatCityName("AGUA DE DIOS")).toBe("Agua de dios");
    expect(formatCityName("VALLE DE SAN JOSE")).toBe("Valle de san jose");
  });

  it("recorta espacios al inicio y al final antes de capitalizar", () => {
    expect(formatCityName("  MEDELLIN  ")).toBe("Medellin");
  });

  it("un nombre que ya viene en mayúscula/minúscula mixta queda igual (idempotente)", () => {
    expect(formatCityName("Armenia")).toBe("Armenia");
  });
});
