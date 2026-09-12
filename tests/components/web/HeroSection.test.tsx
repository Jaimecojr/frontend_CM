import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/image", () => ({
  default: ({
    alt,
    fill: _fill,
    priority: _priority,
    unoptimized: _unoptimized,
    loader: _loader,
    quality: _quality,
    ...props
  }: { alt: string; [key: string]: unknown }) => (
    // eslint-disable-next-line jsx-a11y/alt-text
    <img alt={alt} {...props} />
  ),
}));

vi.mock("@/components/web/AffiliateConsultWidget", () => ({
  AffiliateConsultWidget: () => <div data-testid="affiliate-consult-widget-stub" />,
}));

import { HeroSection } from "@/components/web/HeroSection";

describe("HeroSection", () => {
  describe("Paso 3: Titular y widget de consulta", () => {
    it("muestra el h1 con 'Los Mejores Especialistas a tu Alcance' y el widget de consulta", () => {
      // Arrange & Act
      render(<HeroSection />);

      // Assert
      expect(
        screen.getByRole("heading", { level: 1, name: /Los Mejores Especialistas a tu Alcance/i })
      ).toBeInTheDocument();
      expect(screen.getByTestId("affiliate-consult-widget-stub")).toBeInTheDocument();
    });
  });
});
