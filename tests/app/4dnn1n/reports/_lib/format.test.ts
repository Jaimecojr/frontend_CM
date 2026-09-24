import { describe, it, expect } from "vitest";
import { formatDate, formatMoney } from "@/app/4dnn1n/reports/_lib/format";

describe("formatDate", () => {
  it("should convert yyyy-mm-dd to dd/mm/yyyy", () => {
    // Arrange
    const ymd = "2026-09-23";

    // Act
    const result = formatDate(ymd);

    // Assert
    expect(result).toBe("23/09/2026");
  });

  it("should use only the first 10 characters when a full timestamp is given", () => {
    // Arrange
    const timestamp = "2026-09-23T14:30:00.000Z";

    // Act
    const result = formatDate(timestamp);

    // Assert
    expect(result).toBe("23/09/2026");
  });

  it("should return a dash when the value is null", () => {
    // Act
    const result = formatDate(null);

    // Assert
    expect(result).toBe("-");
  });

  it("should return a dash when the value is undefined", () => {
    // Act
    const result = formatDate(undefined);

    // Assert
    expect(result).toBe("-");
  });

  it("should return a dash when the value is an empty string", () => {
    // Act
    const result = formatDate("");

    // Assert
    expect(result).toBe("-");
  });
});

describe("formatMoney", () => {
  it("should format a number with the es-CO thousands separator", () => {
    // Arrange
    const value = 1500000;

    // Act
    const result = formatMoney(value);

    // Assert
    expect(result).toBe(`$ ${(1500000).toLocaleString("es-CO")}`);
  });

  it("should format a value that arrives as a string", () => {
    // Arrange
    const value = "90000";

    // Act
    const result = formatMoney(value);

    // Assert
    expect(result).toBe(`$ ${(90000).toLocaleString("es-CO")}`);
  });

  it("should treat null as zero", () => {
    // Act
    const result = formatMoney(null);

    // Assert
    expect(result).toBe(`$ ${(0).toLocaleString("es-CO")}`);
  });

  it("should treat undefined as zero", () => {
    // Act
    const result = formatMoney(undefined);

    // Assert
    expect(result).toBe(`$ ${(0).toLocaleString("es-CO")}`);
  });
});
