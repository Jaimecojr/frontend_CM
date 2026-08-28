import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

describe("entorno de pruebas (vitest + jsdom + testing-library)", () => {
  it("renderiza un componente React y aplica los matchers de jest-dom", () => {
    render(<button>Guardar</button>);
    expect(screen.getByRole("button", { name: "Guardar" })).toBeInTheDocument();
  });

  it("resuelve el alias @/ hacia src/", async () => {
    const mod = await import("@/lib/getApiErrorMessage");
    expect(typeof mod.getApiErrorMessage).toBe("function");
  });
});
