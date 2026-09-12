import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

vi.mock("@/components/web/HeroSection", () => ({
  HeroSection: () => <div data-testid="hero-stub">Hero</div>,
}));
vi.mock("@/components/web/QuickAccessSection", () => ({
  QuickAccessSection: () => <div data-testid="quick-access-stub">QuickAccess</div>,
}));
vi.mock("@/components/web/AboutSection", () => ({
  AboutSection: () => <div data-testid="about-stub">About</div>,
}));
vi.mock("@/components/web/AlliesSection", () => ({
  AlliesSection: () => <div data-testid="allies-stub">Allies</div>,
}));
vi.mock("@/components/web/DoctorsSection", () => ({
  DoctorsSection: () => <div data-testid="doctors-stub">Doctors</div>,
}));

import WebPage from "@/app/web/page";

describe("WebPage", () => {
  describe("Paso 1: Orden de las secciones", () => {
    it("renderiza Hero, QuickAccess, About, Allies y Doctors en ese orden", () => {
      // Arrange & Act
      const { container } = render(<WebPage />);

      // Assert
      const order = Array.from(container.querySelectorAll("[data-testid]")).map((el) =>
        el.getAttribute("data-testid")
      );
      expect(order).toEqual([
        "hero-stub",
        "quick-access-stub",
        "about-stub",
        "allies-stub",
        "doctors-stub",
      ]);
    });
  });
});
