import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { AuthProvider, useAuth, type AuthUser } from "@/context/AuthContext";
import { getAuthUser, logout, csrf } from "@/app/4dnn1n/home/fetch";
import { useRouter } from "next/navigation";

vi.mock("@/app/4dnn1n/home/fetch", () => ({
  getAuthUser: vi.fn(),
  logout: vi.fn(),
  csrf: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

const mockedGetAuthUser = vi.mocked(getAuthUser);
const mockedLogout = vi.mocked(logout);
const mockedCsrf = vi.mocked(csrf);
const mockedUseRouter = vi.mocked(useRouter);

const testUser: AuthUser = { id: 1, name: "Ana", email: "ana@test.com", user: "ana", type: 1 };

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

/** Builds a promise plus its resolve/reject controls, to pin down ordering. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("AuthContext", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseRouter.mockReturnValue({
      push: vi.fn(),
      replace: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
    } as unknown as ReturnType<typeof useRouter>);

    // jsdom throws "Not implemented: navigation" on a real `href` assignment;
    // replacing `window.location` with a plain writable object lets
    // logoutUser's redirect be observed without it actually navigating.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).location;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).location = { ...originalLocation, href: "" };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).location = originalLocation;
  });

  describe("refreshUser (auto-ejecutado al montar)", () => {
    it("carga el usuario y pone loading en false cuando getAuthUser resuelve", async () => {
      // Arrange
      mockedGetAuthUser.mockResolvedValue(testUser);

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Assert
      expect(result.current.loading).toBe(true);
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.user).toEqual(testUser);
      expect(mockedGetAuthUser).toHaveBeenCalledTimes(1);
    });

    it("deja user en null y loading en false cuando getAuthUser rechaza", async () => {
      // Arrange
      mockedGetAuthUser.mockRejectedValue(new Error("network down"));

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Assert
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.user).toBeNull();
    });
  });

  describe("useAuth", () => {
    it("lanza un error exacto cuando se usa fuera de <AuthProvider>", () => {
      // Arrange & Act & Assert
      expect(() => renderHook(() => useAuth())).toThrow("useAuth must be inside <AuthProvider>");
    });

    it("retorna el valor del contexto cuando se usa dentro de <AuthProvider>", async () => {
      // Arrange
      mockedGetAuthUser.mockResolvedValue(testUser);

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Assert
      expect(result.current.user).toEqual(testUser);
      expect(typeof result.current.refreshUser).toBe("function");
      expect(typeof result.current.logoutUser).toBe("function");
      expect(result.current.isLoggingOut).toBe(false);
    });
  });

  describe("logoutUser", () => {
    it("marca isLoggingOut en true de inmediato y llama csrf() antes que logout()", async () => {
      // Arrange
      mockedGetAuthUser.mockResolvedValue(testUser);
      const csrfDeferred = deferred<void>();
      const logoutDeferred = deferred<unknown>();
      mockedCsrf.mockReturnValue(csrfDeferred.promise);
      mockedLogout.mockReturnValue(logoutDeferred.promise);

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Act: kick off logoutUser but don't await it yet.
      let logoutPromise!: Promise<void>;
      act(() => {
        logoutPromise = result.current.logoutUser();
      });

      // Assert: isLoggingOut flips synchronously, csrf() runs before logout().
      expect(result.current.isLoggingOut).toBe(true);
      expect(mockedCsrf).toHaveBeenCalledTimes(1);
      expect(mockedLogout).not.toHaveBeenCalled();

      // Act: resolve csrf(), letting logout() be invoked.
      await act(async () => {
        csrfDeferred.resolve();
        await Promise.resolve();
      });
      expect(mockedLogout).toHaveBeenCalledTimes(1);

      // Act: resolve logout(), completing logoutUser().
      await act(async () => {
        logoutDeferred.resolve(undefined);
        await logoutPromise;
      });

      // Assert: finally block ran — user cleared and redirected.
      expect(result.current.user).toBeNull();
      expect(window.location.href).toBe("/auth/sign-in");
    });

    it("limpia el usuario y redirige incluso si csrf() o logout() rechazan, y registra el error", async () => {
      // Arrange
      mockedGetAuthUser.mockResolvedValue(testUser);
      const error = new Error("csrf failed");
      mockedCsrf.mockRejectedValue(error);
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Act
      await act(async () => {
        await result.current.logoutUser();
      });

      // Assert
      expect(mockedLogout).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith("Logout failed:", error);
      expect(result.current.user).toBeNull();
      expect(window.location.href).toBe("/auth/sign-in");
    });
  });
});
