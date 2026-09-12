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

import { AboutSection } from "@/components/web/AboutSection";

describe("AboutSection", () => {
  describe("Paso 5: Badges de experiencia y link", () => {
    it("muestra los 3 badges de experiencia y el link 'Conoce más sobre nosotros' con su href", () => {
      // Arrange & Act
      render(<AboutSection />);

      // Assert: badges de experiencia
      expect(screen.getByText("15+")).toBeInTheDocument();
      expect(screen.getByText("+5")).toBeInTheDocument();
      expect(screen.getByText("500+")).toBeInTheDocument();

      // Assert: link hacia quiénes somos
      expect(
        screen.getByRole("link", { name: /Conoce más sobre nosotros/i })
      ).toHaveAttribute("href", "/web/quienes-somos");
    });
  });
});
