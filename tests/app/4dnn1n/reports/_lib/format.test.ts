import { describe, it, expect } from "vitest";
import { formatDate, formatMoney } from "@/app/4dnn1n/reports/_lib/format";

describe("formatDate", () => {
  it("convierte yyyy-mm-dd a dd/mm/yyyy", () => {
    // Arrange
    const ymd = "2026-09-23";

    // Act
    const result = formatDate(ymd);

    // Assert
    expect(result).toBe("23/09/2026");
  });

  it("usa solo los primeros 10 caracteres cuando viene un timestamp completo", () => {
    // Arrange
    const timestamp = "2026-09-23T14:30:00.000Z";

    // Act
    const result = formatDate(timestamp);

    // Assert
    expect(result).toBe("23/09/2026");
  });

  it("retorna guion para null", () => {
    // Act
    const result = formatDate(null);

    // Assert
    expect(result).toBe("-");
  });

  it("retorna guion para undefined", () => {
    // Act
    const result = formatDate(undefined);

    // Assert
    expect(result).toBe("-");
  });

  it("retorna guion para cadena vacía", () => {
    // Act
    const result = formatDate("");

    // Assert
    expect(result).toBe("-");
  });
});

describe("formatMoney", () => {
  it("formatea un número con separador de miles es-CO", () => {
    // Arrange
    const value = 1500000;

    // Act
    const result = formatMoney(value);

    // Assert
    expect(result).toBe(`$ ${(1500000).toLocaleString("es-CO")}`);
  });

  it("formatea un valor que llega como string", () => {
    // Arrange
    const value = "90000";

    // Act
    const result = formatMoney(value);

    // Assert
    expect(result).toBe(`$ ${(90000).toLocaleString("es-CO")}`);
  });

  it("trata null como cero", () => {
    // Act
    const result = formatMoney(null);

    // Assert
    expect(result).toBe(`$ ${(0).toLocaleString("es-CO")}`);
  });

  it("trata undefined como cero", () => {
    // Act
    const result = formatMoney(undefined);

    // Assert
    expect(result).toBe(`$ ${(0).toLocaleString("es-CO")}`);
  });
});
