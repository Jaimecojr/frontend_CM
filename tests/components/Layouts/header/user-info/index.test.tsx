import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { UserInfo } from "@/components/Layouts/header/user-info";
import { useAuth } from "@/context/AuthContext";

vi.mock("@/context/AuthContext", () => ({ useAuth: vi.fn() }));

// AuthContext's real AuthContextType is not exported and also carries `isLoggingOut` /
// `refreshUser`, which UserInfo never reads — this local type mirrors only what the
// component actually destructures from useAuth().
type MockAuthUser = { user: string; name: string; email: string };
type MockAuthValue = {
  user: MockAuthUser | null;
  loading: boolean;
  logoutUser: () => Promise<void>;
};

function mockAuth(overrides: Partial<MockAuthValue> = {}) {
  const logoutUser = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
  const value: MockAuthValue = {
    user: null,
    loading: true,
    logoutUser,
    ...overrides,
  };
  vi.mocked(useAuth).mockReturnValue(value as unknown as ReturnType<typeof useAuth>);
  return { logoutUser };
}

const AUTHENTICATED_USER: MockAuthUser = {
  user: "jperez",
  name: "Juan Pérez",
  email: "j@x.com",
};

describe("UserInfo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Paso 1: placeholder mientras carga", () => {
    it("con loading=true renderiza solo el placeholder animate-pulse", () => {
      // Arrange & Act
      mockAuth({ loading: true, user: null });
      const { container } = render(<UserInfo />);

      // Assert
      expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("con user=null (aunque loading sea false) también renderiza el placeholder", () => {
      // Arrange & Act
      mockAuth({ loading: false, user: null });
      const { container } = render(<UserInfo />);

      // Assert
      expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
    });
  });

  describe("Paso 2: usuario autenticado", () => {
    it("muestra la inicial en mayúscula derivada de user.user (con prioridad sobre user.name) y el nombre", () => {
      // Arrange & Act
      mockAuth({ loading: false, user: AUTHENTICATED_USER });
      render(<UserInfo />);

      // Assert: avatarLetter = (user.user || user.name).charAt(0).toUpperCase() -> "J"
      expect(screen.getByText("J")).toBeInTheDocument();
      // Displayed name = user.user || user.name -> "jperez" takes priority over "Juan Pérez"
      expect(screen.getByText("jperez")).toBeInTheDocument();
      expect(screen.queryByText("Juan Pérez")).not.toBeInTheDocument();
    });
  });

  describe("Paso 3: apertura del dropdown", () => {
    it("al hacer click en el trigger abre el dropdown con el email, el toggle de tema real y los links/acciones", () => {
      // Arrange
      mockAuth({ loading: false, user: AUTHENTICATED_USER });
      render(<UserInfo />);

      // Act
      fireEvent.click(screen.getByRole("button"));

      // Assert
      expect(screen.getByRole("menu")).toBeInTheDocument();
      expect(screen.getByText("j@x.com")).toBeInTheDocument();
      // ThemeToggleSwitch is integrated for real (not mocked) — its sr-only text proves it rendered
      expect(screen.getByText(/^Switch to (dark|light) mode$/)).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /Configuración/i })).toHaveAttribute(
        "href",
        "/4dnn1n/account",
      );
      expect(screen.getByRole("button", { name: /Cerrar sesión/i })).toBeInTheDocument();
    });
  });

  describe("Paso 4: cerrar sesión", () => {
    it("al hacer click en 'Cerrar sesión' invoca logoutUser() del contexto", () => {
      // Arrange
      const { logoutUser } = mockAuth({ loading: false, user: AUTHENTICATED_USER });
      render(<UserInfo />);
      fireEvent.click(screen.getByRole("button"));

      // Act
      fireEvent.click(screen.getByRole("button", { name: /Cerrar sesión/i }));

      // Assert
      expect(logoutUser).toHaveBeenCalledTimes(1);
    });
  });

  describe("Paso 5: navegación cierra el dropdown", () => {
    it("al hacer click en el link 'Configuración' invoca setIsOpen(false) y cierra el dropdown", () => {
      // Arrange
      mockAuth({ loading: false, user: AUTHENTICATED_USER });
      render(<UserInfo />);
      fireEvent.click(screen.getByRole("button"));
      expect(screen.getByRole("menu")).toBeInTheDocument();

      // Act
      fireEvent.click(screen.getByRole("link", { name: /Configuración/i }));

      // Assert
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });
  });
});
