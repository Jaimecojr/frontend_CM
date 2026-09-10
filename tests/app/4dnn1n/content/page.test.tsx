import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import ContentPage from "@/app/4dnn1n/content/page";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  useParams: vi.fn(),
  useSearchParams: vi.fn(),
}));

vi.mock("@/context/AuthContext", () => ({ useAuth: vi.fn() }));

function mockAuth(type: number | null) {
  (useAuth as any).mockReturnValue({
    user: type === null ? null : { id: 1, type },
    loading: false,
    isLoggingOut: false,
  });
}

describe("ContentPage", () => {
  let replaceMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    replaceMock = vi.fn();
    (useRouter as any).mockReturnValue({ replace: replaceMock, push: vi.fn() });
  });

  describe("gate de permisos", () => {
    it("user.type: 2 → no renderiza el hub (retorna null) y redirige vía router.replace", async () => {
      // Arrange
      mockAuth(2);

      // Act
      const { container } = render(<ContentPage />);

      // Assert
      expect(container).toBeEmptyDOMElement();
      await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/4dnn1n/home"));
    });

    it("user.type: 1 → renderiza el título y los 2 links, sin redirección", async () => {
      // Arrange
      mockAuth(1);

      // Act
      render(<ContentPage />);

      // Assert
      expect(
        await screen.findByRole("heading", { name: "Administración de Contenido" }),
      ).toBeInTheDocument();

      const alliesLink = screen.getByRole("link", { name: /Aliados Estratégicos/ });
      expect(alliesLink).toHaveAttribute("href", "/4dnn1n/content/allies");
      expect(alliesLink).toHaveTextContent("Máximo 6");

      const specialistsLink = screen.getByRole("link", { name: /Especialistas de la Salud/ });
      expect(specialistsLink).toHaveAttribute("href", "/4dnn1n/content/specialists");
      expect(specialistsLink).toHaveTextContent("Máximo 4");

      expect(replaceMock).not.toHaveBeenCalled();
    });

    it("user: null (aún no resuelto) → retorna null sin llamar router.replace todavía", async () => {
      // Arrange
      mockAuth(null);

      // Act
      const { container } = render(<ContentPage />);

      // Assert
      expect(container).toBeEmptyDOMElement();
      expect(replaceMock).not.toHaveBeenCalled();
    });
  });
});
