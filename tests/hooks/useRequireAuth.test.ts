import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

vi.mock("@/context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

function mockAuth(overrides: Partial<ReturnType<typeof useAuth>> = {}) {
  (useAuth as any).mockReturnValue({
    user: null,
    loading: false,
    isLoggingOut: false,
    refreshUser: vi.fn(),
    logoutUser: vi.fn(),
    ...overrides,
  });
}

describe("useRequireAuth", () => {
  const replace = vi.fn();

  beforeEach(() => {
    replace.mockClear();
    (useRouter as any).mockReturnValue({ replace });
  });

  it("no redirige mientras loading es true, sin importar el usuario", () => {
    mockAuth({ user: null, loading: true, isLoggingOut: false });

    renderHook(() => useRequireAuth());

    expect(replace).not.toHaveBeenCalled();
  });

  it("redirige a /auth/sign-in cuando terminó de cargar y no hay usuario", () => {
    mockAuth({ user: null, loading: false, isLoggingOut: false });

    renderHook(() => useRequireAuth());

    expect(replace).toHaveBeenCalledWith("/auth/sign-in");
  });

  it("no redirige cuando terminó de cargar y sí hay un usuario autenticado", () => {
    mockAuth({
      user: { id: 1, name: "Ana", email: "ana@test.com", user: "ana", type: 1 },
      loading: false,
      isLoggingOut: false,
    });

    renderHook(() => useRequireAuth());

    expect(replace).not.toHaveBeenCalled();
  });

  it("no redirige si el usuario está en medio de un logout", () => {
    mockAuth({ user: null, loading: false, isLoggingOut: true });

    renderHook(() => useRequireAuth());

    expect(replace).not.toHaveBeenCalled();
  });
});
