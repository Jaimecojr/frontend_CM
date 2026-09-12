import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Navbar } from "@/components/web/Navbar";
import { usePathname } from "next/navigation";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
}));

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

const usePathnameMock = vi.mocked(usePathname);

describe("Navbar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Paso 1: Resaltado del link activo", () => {
    it("cuando pathname='/web/servicios', el link 'Servicios' tiene la clase text-[#E8192C] y los demás tienen text-[#64748B]", () => {
      // Arrange & Act
      usePathnameMock.mockReturnValue("/web/servicios");
      render(<Navbar />);

      const serviciosLink = screen.getByRole("link", { name: "Servicios" }) as HTMLAnchorElement;
      const inicioLink = screen.getByRole("link", { name: "Inicio" }) as HTMLAnchorElement;
      const guiaMedicaLink = screen.getByRole("link", { name: "Guía Médica" }) as HTMLAnchorElement;
      const contactenosLink = screen.getByRole("link", { name: "Contáctenos" }) as HTMLAnchorElement;

      // Assert: Servicios is active
      expect(serviciosLink.className).toContain("text-[#E8192C]");
      // Assert: others are inactive
      expect(inicioLink.className).toContain("text-[#64748B]");
      expect(guiaMedicaLink.className).toContain("text-[#64748B]");
      expect(contactenosLink.className).toContain("text-[#64748B]");
    });

    it("cuando pathname='/web/afiliarse', el botón CTA 'Afíliate' tiene la clase opacity-90 adicional", () => {
      // Arrange & Act
      usePathnameMock.mockReturnValue("/web/afiliarse");
      render(<Navbar />);

      const ctaButton = screen.getByRole("link", { name: /Afíliate/ }) as HTMLAnchorElement;

      // Assert
      expect(ctaButton.className).toContain("opacity-90");
    });

    it("cuando pathname no es '/web/afiliarse', el botón CTA 'Afíliate' NO tiene la clase opacity-90", () => {
      // Arrange & Act
      usePathnameMock.mockReturnValue("/web/servicios");
      render(<Navbar />);

      const ctaButton = screen.getByRole("link", { name: /Afíliate/ }) as HTMLAnchorElement;

      // Assert
      expect(ctaButton.className).not.toContain("opacity-90");
    });
  });

  describe("Paso 2: Menú móvil", () => {
    it("render inicial: el panel móvil no se muestra", () => {
      // Arrange & Act
      usePathnameMock.mockReturnValue("/web");
      render(<Navbar />);

      // Assert: mobile panel should not be in the document initially
      const mobilePanel = screen.queryByText("Inicio", {
        selector: "a[href='/web'][class*='py-3']",
      });
      expect(mobilePanel).not.toBeInTheDocument();
    });

    it("click en el botón hamburguesa abre el menú móvil: aria-expanded='true', ícono cambia a 'close', lista de links duplicada aparece", () => {
      // Arrange
      usePathnameMock.mockReturnValue("/web");
      render(<Navbar />);
      const hamburgerButton = screen.getByRole("button", { name: "Abrir menú" });

      // Act: click hamburger
      fireEvent.click(hamburgerButton);

      // Assert: aria-expanded is true
      expect(hamburgerButton).toHaveAttribute("aria-expanded", "true");

      // Assert: icon changed to close
      expect(hamburgerButton.textContent).toContain("close");

      // Assert: mobile link list is visible
      // Find the mobile-only links which are in a different structure than desktop links
      // Mobile links appear in py-3 block elements after hamburger click
      const mobileLinks = screen.getAllByText("Inicio");
      expect(mobileLinks.length).toBeGreaterThan(1); // At least desktop + mobile
    });

    it("click nuevamente en el botón hamburguesa cierra el menú móvil: aria-expanded='false', ícono cambia a 'menu'", () => {
      // Arrange
      usePathnameMock.mockReturnValue("/web");
      render(<Navbar />);
      const hamburgerButton = screen.getByRole("button", { name: "Abrir menú" });

      // Act: open
      fireEvent.click(hamburgerButton);
      expect(hamburgerButton).toHaveAttribute("aria-expanded", "true");

      // Act: close
      fireEvent.click(hamburgerButton);

      // Assert: aria-expanded is false
      expect(hamburgerButton).toHaveAttribute("aria-expanded", "false");

      // Assert: icon changed back to menu
      expect(hamburgerButton.textContent).toContain("menu");
      expect(hamburgerButton.textContent).not.toContain("close");
    });

    it("cambiar pathname (navegación) cierra automáticamente el menú móvil mediante rerender", () => {
      // Arrange
      usePathnameMock.mockReturnValue("/web");
      const { rerender } = render(<Navbar />);
      const hamburgerButton = screen.getByRole("button", { name: "Abrir menú" });

      // Act: open the menu
      fireEvent.click(hamburgerButton);
      expect(hamburgerButton).toHaveAttribute("aria-expanded", "true");

      // Act: simulate pathname change by rerender with new mocked value
      usePathnameMock.mockReturnValue("/web/servicios");
      rerender(<Navbar />);

      // Assert: menu is closed after pathname change
      const newHamburgerButton = screen.getByRole("button", { name: "Abrir menú" });
      expect(newHamburgerButton).toHaveAttribute("aria-expanded", "false");
      expect(newHamburgerButton.textContent).toContain("menu");
    });
  });
});
