import { describe, it, expect } from "vitest";
import { toQueryString } from "@/app/4dnn1n/reports/_lib/query";

describe("toQueryString", () => {
  it("should return an empty string when there are no params", () => {
    // Arrange
    const params = {};

    // Act
    const result = toQueryString(params);

    // Assert
    expect(result).toBe("");
  });

  it("should omit undefined values and empty strings", () => {
    // Arrange
    const params = { from: "2026-01-01", to: undefined, search: "" };

    // Act
    const result = toQueryString(params);

    // Assert
    expect(result).toBe("?from=2026-01-01");
  });

  it("should serialize numbers as text", () => {
    // Arrange
    const params = { page: 2, per_page: 25 };

    // Act
    const result = toQueryString(params);

    // Assert
    expect(result).toBe("?page=2&per_page=25");
  });

  it("should preserve the insertion order of the keys", () => {
    // Arrange
    const params = { c: "3", a: "1", b: "2" };

    // Act
    const result = toQueryString(params);

    // Assert
    expect(result).toBe("?c=3&a=1&b=2");
  });

  it("should return an empty string when all values are empty", () => {
    // Arrange
    const params = { from: undefined, to: "" };

    // Act
    const result = toQueryString(params);

    // Assert
    expect(result).toBe("");
  });
});
