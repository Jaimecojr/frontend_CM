import { describe, it, expect } from "vitest";
import { toQueryString } from "@/app/4dnn1n/reports/_lib/query";

describe("toQueryString", () => {
  it("retorna cadena vacía cuando no hay params", () => {
    // Arrange
    const params = {};

    // Act
    const result = toQueryString(params);

    // Assert
    expect(result).toBe("");
  });

  it("omite valores undefined y cadenas vacías", () => {
    // Arrange
    const params = { from: "2026-01-01", to: undefined, search: "" };

    // Act
    const result = toQueryString(params);

    // Assert
    expect(result).toBe("?from=2026-01-01");
  });

  it("serializa números como texto", () => {
    // Arrange
    const params = { page: 2, per_page: 25 };

    // Act
    const result = toQueryString(params);

    // Assert
    expect(result).toBe("?page=2&per_page=25");
  });

  it("preserva el orden de inserción de las claves", () => {
    // Arrange
    const params = { c: "3", a: "1", b: "2" };

    // Act
    const result = toQueryString(params);

    // Assert
    expect(result).toBe("?c=3&a=1&b=2");
  });

  it("retorna cadena vacía cuando todos los valores están vacíos", () => {
    // Arrange
    const params = { from: undefined, to: "" };

    // Act
    const result = toQueryString(params);

    // Assert
    expect(result).toBe("");
  });
});
