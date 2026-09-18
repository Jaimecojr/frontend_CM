import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import AuthLayoutClient from "@/app/4dnn1n/auth-layout";
import { useRequireAuth } from "@/hooks/useRequireAuth";

vi.mock("@/hooks/useRequireAuth", () => ({ useRequireAuth: vi.fn() }));

vi.mock("@/components/LoadingOverlay", () => ({
  LoadingOverlay: ({ message }: { message?: string }) => (
    <div data-testid="loading-overlay">{message ?? "Cargando"}</div>
  ),
}));

vi.mock("@/components/Layouts/sidebar", () => ({
  Sidebar: () => <div data-testid="sidebar" />,
}));

vi.mock("@/components/Layouts/header", () => ({
  Header: () => <div data-testid="header" />,
}));

vi.mock("@/app/4dnn1n/providers", () => ({
  Providers: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="providers">{children}</div>
  ),
}));

vi.mock("nextjs-toploader", () => ({
  default: () => <div data-testid="toploader" />,
}));

function mockRequireAuth(overrides: Partial<ReturnType<typeof useRequireAuth>> = {}) {
  (useRequireAuth as any).mockReturnValue({
    user: null,
    loading: false,
    isLoggingOut: false,
    ...overrides,
  });
}

describe("AuthLayoutClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("muestra el overlay con 'Cerrando sesión' cuando isLoggingOut es true", () => {
    // Arrange
    mockRequireAuth({ isLoggingOut: true, loading: false, user: { id: 1, name: "Ana", email: "ana@example.com", user: "ana", type: 2 } });

    // Act
    render(<AuthLayoutClient>contenido</AuthLayoutClient>);

    // Assert
    expect(screen.getByTestId("loading-overlay")).toHaveTextContent("Cerrando sesión");
    expect(screen.queryByTestId("sidebar")).not.toBeInTheDocument();
  });

  it("muestra el overlay con 'Validando sesión' cuando loading es true y no está cerrando sesión", () => {
    // Arrange
    mockRequireAuth({ loading: true, isLoggingOut: false, user: null });

    // Act
    render(<AuthLayoutClient>contenido</AuthLayoutClient>);

    // Assert
    expect(screen.getByTestId("loading-overlay")).toHaveTextContent("Validando sesión");
    expect(screen.queryByTestId("sidebar")).not.toBeInTheDocument();
  });

  it("prioriza 'Cerrando sesión' sobre 'Validando sesión' cuando ambos flags son true", () => {
    // Arrange
    mockRequireAuth({ isLoggingOut: true, loading: true, user: null });

    // Act
    render(<AuthLayoutClient>contenido</AuthLayoutClient>);

    // Assert
    expect(screen.getByTestId("loading-overlay")).toHaveTextContent("Cerrando sesión");
  });

  it("no renderiza nada cuando terminó de cargar y no hay usuario", () => {
    // Arrange
    mockRequireAuth({ loading: false, isLoggingOut: false, user: null });

    // Act
    const { container } = render(<AuthLayoutClient>contenido</AuthLayoutClient>);

    // Assert
    expect(container).toBeEmptyDOMElement();
  });

  it("renderiza el layout completo (Providers, toploader, Sidebar, Header, children) cuando hay usuario autenticado", () => {
    // Arrange
    mockRequireAuth({ loading: false, isLoggingOut: false, user: { id: 1, name: "Ana", email: "ana@example.com", user: "ana", type: 2 } });

    // Act
    render(
      <AuthLayoutClient>
        <div data-testid="children">Hola</div>
      </AuthLayoutClient>,
    );

    // Assert
    expect(screen.getByTestId("providers")).toBeInTheDocument();
    expect(screen.getByTestId("toploader")).toBeInTheDocument();
    expect(screen.getByTestId("sidebar")).toBeInTheDocument();
    expect(screen.getByTestId("header")).toBeInTheDocument();
    expect(screen.getByTestId("children")).toHaveTextContent("Hola");
    expect(screen.queryByTestId("loading-overlay")).not.toBeInTheDocument();
  });
});
