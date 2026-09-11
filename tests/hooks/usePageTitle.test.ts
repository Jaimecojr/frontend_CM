import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { usePageTitle } from "@/hooks/usePageTitle";

describe("usePageTitle", () => {
  it("establece document.title con el sufijo del panel", () => {
    // Arrange & Act
    renderHook(() => usePageTitle("Afiliados"));

    // Assert
    expect(document.title).toBe("Afiliados | Contacto Médico Admin");
  });

  it("actualiza document.title cuando el título cambia entre renders", () => {
    // Arrange
    const { rerender } = renderHook(({ title }) => usePageTitle(title), {
      initialProps: { title: "Afiliados" },
    });
    expect(document.title).toBe("Afiliados | Contacto Médico Admin");

    // Act
    rerender({ title: "Citas" });

    // Assert
    expect(document.title).toBe("Citas | Contacto Médico Admin");
  });
});
