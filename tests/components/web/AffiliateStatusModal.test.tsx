import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import { AffiliateStatusModal } from "@/components/web/AffiliateStatusModal";
import { AffiliateStatusResponse } from "@/components/web/affiliateService";

type AffiliateData = NonNullable<AffiliateStatusResponse["data"]>;

// Builds a successful response with a realistic active affiliate, overridable
// per test so each case only sets what it actually needs to assert on.
function buildActiveResult(overrides: Partial<AffiliateData> = {}): AffiliateStatusResponse {
  return {
    success: true,
    message: "Encontrado",
    data: {
      name: "Juan",
      lastname: "Pérez",
      id_card: "1000000001",
      stade: 1,
      validity_end: "2026-12-31",
      beneficiaries: [],
      ...overrides,
    },
  };
}

describe("AffiliateStatusModal", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15"));
  });

  afterEach(() => {
    vi.useRealTimers();
    // Belt-and-suspenders: even though the component's own cleanup effect
    // resets this on unmount, guard against it leaking into other test files.
    document.body.style.overflow = "";
  });

  describe("afiliado activo", () => {
    it("muestra el chip verde 'Afiliación Activa — Vigente hasta 31/12/2026' cuando stade=1 y validity_end es futura", () => {
      // Arrange
      const result = buildActiveResult({ stade: 1, validity_end: "2026-12-31" });

      // Act
      render(<AffiliateStatusModal result={result} onClose={vi.fn()} />);

      // Assert
      const chipText = screen.getByText("Afiliación Activa — Vigente hasta 31/12/2026");
      expect(chipText).toBeInTheDocument();
      const chip = chipText.parentElement as HTMLElement;
      expect(chip.className).toContain("bg-emerald-50");
    });

    it("calcula las iniciales del titular a partir de name y lastname", () => {
      // Arrange
      const result = buildActiveResult({ name: "Juan", lastname: "Pérez" });

      // Act
      render(<AffiliateStatusModal result={result} onClose={vi.fn()} />);

      // Assert
      expect(screen.getByText("JP")).toBeInTheDocument();
      expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
    });

    it("lista los beneficiarios y muestra el contador junto al título 'Beneficiarios'", () => {
      // Arrange
      const result = buildActiveResult({
        beneficiaries: [{ name: "Ana" }, { name: "Luis" }],
      });

      // Act
      render(<AffiliateStatusModal result={result} onClose={vi.fn()} />);

      // Assert
      expect(screen.getByText("Ana")).toBeInTheDocument();
      expect(screen.getByText("Luis")).toBeInTheDocument();
      const title = screen.getByText("Beneficiarios");
      const counterRow = title.parentElement as HTMLElement;
      expect(within(counterRow).getByText("2")).toBeInTheDocument();
    });

    it("muestra 'Sin beneficiarios registrados.' cuando la lista de beneficiarios está vacía", () => {
      // Arrange
      const result = buildActiveResult({ beneficiaries: [] });

      // Act
      render(<AffiliateStatusModal result={result} onClose={vi.fn()} />);

      // Assert
      expect(screen.getByText("Sin beneficiarios registrados.")).toBeInTheDocument();
      const title = screen.getByText("Beneficiarios");
      const counterRow = title.parentElement as HTMLElement;
      expect(within(counterRow).getByText("0")).toBeInTheDocument();
    });
  });

  describe("afiliado inactivo o no encontrado", () => {
    it("muestra el chip rojo 'Afiliación Inactiva — Venció 01/01/2026' cuando stade=1 pero validity_end ya pasó", () => {
      // Arrange: "today" is fixed at 2026-06-15, so this validity_end is in the past
      const result = buildActiveResult({ stade: 1, validity_end: "2026-01-01" });

      // Act
      render(<AffiliateStatusModal result={result} onClose={vi.fn()} />);

      // Assert
      const chipText = screen.getByText("Afiliación Inactiva — Venció 01/01/2026");
      expect(chipText).toBeInTheDocument();
      const chip = chipText.parentElement as HTMLElement;
      expect(chip.className).toContain("bg-red-50");
    });

    it("trata al afiliado como inactivo cuando stade=2, sin importar que validity_end sea futura", () => {
      // Arrange
      const result = buildActiveResult({ stade: 2, validity_end: "2026-12-31" });

      // Act
      render(<AffiliateStatusModal result={result} onClose={vi.fn()} />);

      // Assert: same "Inactiva" wording is used regardless of the date, driven only by stade
      const chipText = screen.getByText("Afiliación Inactiva — Venció 31/12/2026");
      expect(chipText).toBeInTheDocument();
      const chip = chipText.parentElement as HTMLElement;
      expect(chip.className).toContain("bg-red-50");
    });

    it("muestra el bloque de error con result.message y oculta la sección de titular/beneficiarios cuando success=false y no hay data", () => {
      // Arrange
      const result: AffiliateStatusResponse = {
        success: false,
        message: "Documento no encontrado",
      };

      // Act
      render(<AffiliateStatusModal result={result} onClose={vi.fn()} />);

      // Assert
      expect(screen.getByText("Documento no encontrado")).toBeInTheDocument();
      expect(screen.queryByText("Beneficiarios")).not.toBeInTheDocument();
      expect(screen.queryByText("CC.", { exact: false })).not.toBeInTheDocument();
    });
  });

  describe("Escape, bloqueo de scroll, portal y backdrop", () => {
    it("bloquea el scroll del body al montar y lo restaura al desmontar", () => {
      // Arrange & Act
      const { unmount } = render(
        <AffiliateStatusModal result={buildActiveResult()} onClose={vi.fn()} />
      );

      // Assert
      expect(document.body.style.overflow).toBe("hidden");

      // Act
      unmount();

      // Assert
      expect(document.body.style.overflow).toBe("");
    });

    it("invoca onClose al presionar Escape", () => {
      // Arrange
      const onClose = vi.fn();
      render(<AffiliateStatusModal result={buildActiveResult()} onClose={onClose} />);

      // Act
      fireEvent.keyDown(document, { key: "Escape" });

      // Assert
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("se renderiza mediante portal directamente en document.body (role dialog visible vía screen)", () => {
      // Arrange & Act
      const { container } = render(
        <AffiliateStatusModal result={buildActiveResult()} onClose={vi.fn()} />
      );

      // Assert: the dialog is NOT a descendant of the render container (it's
      // portaled to document.body instead), yet it's still found via screen.
      expect(container).toBeEmptyDOMElement();
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("invoca onClose al hacer click en el backdrop", () => {
      // Arrange
      const onClose = vi.fn();
      render(<AffiliateStatusModal result={buildActiveResult()} onClose={onClose} />);
      const dialog = screen.getByRole("dialog");
      const backdrop = dialog.parentElement as HTMLElement;

      // Act
      fireEvent.click(backdrop);

      // Assert
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("no invoca onClose al hacer click dentro del panel (stopPropagation)", () => {
      // Arrange
      const onClose = vi.fn();
      render(<AffiliateStatusModal result={buildActiveResult()} onClose={onClose} />);
      const dialog = screen.getByRole("dialog");

      // Act
      fireEvent.click(dialog);

      // Assert
      expect(onClose).not.toHaveBeenCalled();
    });
  });
});
