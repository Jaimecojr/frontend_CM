import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("combina clases simples sin conflicto", () => {
    // Arrange & Act
    const result = cn("a", "b");

    // Assert
    expect(result).toBe("a b");
  });

  it("resuelve conflictos tailwind con tailwind-merge, quedándose con el último", () => {
    // Arrange & Act
    const result = cn("p-2", "p-4");

    // Assert
    expect(result).toBe("p-4");
  });

  it("ignora valores falsy (false, undefined) en el patrón clsx", () => {
    // Arrange & Act
    const result = cn("a", false && "b", undefined, "c");

    // Assert
    expect(result).toBe("a c");
  });
});
