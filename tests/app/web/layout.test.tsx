import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

vi.mock("@/components/web/Navbar", () => ({
  Navbar: () => <div data-testid="navbar-stub">Navbar</div>,
}));
vi.mock("@/components/web/Footer", () => ({
  Footer: () => <div data-testid="footer-stub">Footer</div>,
}));

import WebLayout from "@/app/web/layout";

describe("WebLayout", () => {
  describe("Paso 2: Orden de Navbar, children y Footer", () => {
    it("renderiza Navbar, el children recibido y Footer en ese orden", () => {
      // Arrange & Act
      const { container } = render(
        <WebLayout>
          <div data-testid="children-stub">Contenido</div>
        </WebLayout>
      );

      // Assert
      const order = Array.from(container.querySelectorAll("[data-testid]")).map((el) =>
        el.getAttribute("data-testid")
      );
      expect(order).toEqual(["navbar-stub", "children-stub", "footer-stub"]);
    });
  });
});
