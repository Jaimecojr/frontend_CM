import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { Footer } from "@/components/web/Footer";

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

vi.mock("@/components/web/LegalModal", () => ({
  default: ({ type, onClose }: { type: "privacy" | "terms"; onClose: () => void }) => (
    <div data-testid="legal-modal" data-type={type}>
      <button type="button" onClick={onClose}>
        cerrar-modal
      </button>
    </div>
  ),
}));

const fetchMock = vi.fn<typeof fetch>();

function mockResponse(ok: boolean, data: unknown): Response {
  return {
    ok,
    json: async () => data,
  } as Response;
}

describe("Footer", () => {
  beforeEach(() => {
    global.fetch = fetchMock as unknown as typeof fetch;
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Paso 1: Carga y filtro de franquicias", () => {
    it("lista solo las franquicias con address no vacío, con ciudad y dirección en Title Case", async () => {
      // Arrange
      fetchMock.mockResolvedValue(
        mockResponse(true, {
          data: [
            { id: 1, name: "Sede Centro", address: "calle 10", city: { id: 1, name: "armenia" } },
            { id: 2, name: "Sede Sin Dirección", address: null, city: null },
          ],
        })
      );

      // Act
      render(<Footer />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText("Armenia:")).toBeInTheDocument();
      });
      expect(screen.getByText("Calle 10")).toBeInTheDocument();
      expect(screen.queryByText(/Sede Sin Dirección/i)).not.toBeInTheDocument();
    });

    it("cuando la franquicia tiene address pero city es null, usa franchise.name como etiqueta (Title Case)", async () => {
      // Arrange
      fetchMock.mockResolvedValue(
        mockResponse(true, {
          data: [
            { id: 3, name: "sede móvil", address: "carrera 5", city: null },
          ],
        })
      );

      // Act
      render(<Footer />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText("Sede Móvil:")).toBeInTheDocument();
      });
      expect(screen.getByText("Carrera 5")).toBeInTheDocument();
    });

    it("cuando fetch rechaza, franchises queda vacío y el resto del footer se renderiza igual", async () => {
      // Arrange
      fetchMock.mockRejectedValue(new Error("network error"));

      // Act
      render(<Footer />);

      // Assert: no franchise items rendered, no crash
      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledTimes(1);
      });
      expect(screen.getByText("Nuestras Sedes")).toBeInTheDocument();
      expect(screen.queryByText(/^Armenia:/)).not.toBeInTheDocument();
      // Rest of the footer still renders
      expect(screen.getByText("Aviso de Privacidad")).toBeInTheDocument();
      expect(screen.getByText("Términos y Condiciones")).toBeInTheDocument();
    });

    it("cuando fetch resuelve con ok:false, franchises queda vacío y el resto del footer se renderiza igual", async () => {
      // Arrange
      fetchMock.mockResolvedValue(mockResponse(false, { data: [] }));

      // Act
      render(<Footer />);

      // Assert
      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledTimes(1);
      });
      expect(screen.getByText("Nuestras Sedes")).toBeInTheDocument();
      expect(screen.queryByText(/^Armenia:/)).not.toBeInTheDocument();
      expect(screen.getByText("Aviso de Privacidad")).toBeInTheDocument();
    });
  });

  describe("Paso 2: Modales legales", () => {
    beforeEach(() => {
      fetchMock.mockResolvedValue(mockResponse(true, { data: [] }));
    });

    it("click en 'Aviso de Privacidad' renderiza LegalModal con type='privacy'", async () => {
      // Arrange
      render(<Footer />);
      // Flush the pending getActiveFranchises().then(setFranchises) update
      // triggered by render, before this test's own state updates, so React
      // doesn't warn about an update outside act() landing after the test.
      await waitFor(() => {});

      // Act
      fireEvent.click(screen.getByText("Aviso de Privacidad"));

      // Assert
      const modal = screen.getByTestId("legal-modal");
      expect(modal).toHaveAttribute("data-type", "privacy");
    });

    it("click en 'Términos y Condiciones' renderiza LegalModal con type='terms'", async () => {
      // Arrange
      render(<Footer />);
      await waitFor(() => {});

      // Act
      fireEvent.click(screen.getByText("Términos y Condiciones"));

      // Assert
      const modal = screen.getByTestId("legal-modal");
      expect(modal).toHaveAttribute("data-type", "terms");
    });

    it("cerrar el modal (onClose) hace que legalModal vuelva a null y el modal desaparezca", async () => {
      // Arrange
      render(<Footer />);
      await waitFor(() => {});
      fireEvent.click(screen.getByText("Aviso de Privacidad"));
      expect(screen.getByTestId("legal-modal")).toBeInTheDocument();

      // Act
      fireEvent.click(screen.getByText("cerrar-modal"));

      // Assert
      expect(screen.queryByTestId("legal-modal")).not.toBeInTheDocument();
    });
  });

  describe("Paso 3: Copyright", () => {
    it("muestra el año actual en el texto de copyright", async () => {
      // Arrange
      // Local-time constructor (year, month, day, hour) avoids the UTC
      // midnight boundary gotcha of `new Date("2026-01-01")`, which can
      // roll back to the previous year in negative-UTC-offset timezones.
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 0, 1, 12));
      fetchMock.mockResolvedValue(mockResponse(true, { data: [] }));

      // Act
      render(<Footer />);
      // Flush the pending getActiveFranchises().then(setFranchises) update
      // before asserting, so it doesn't land after the test finishes.
      // `waitFor` polls via setTimeout, which never fires under fake timers
      // unless advanced, so use advanceTimersByTimeAsync instead to drain
      // the microtask queue, wrapped in act() so the resulting setFranchises
      // state update is not flagged as happening outside a test's act scope.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      // Assert
      expect(screen.getByText(/2026 Contacto Médico/)).toBeInTheDocument();
    });
  });
});
