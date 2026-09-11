import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, getXsrfToken } from "@/lib/api";

// Minimal Response stand-in for global.fetch mocks: apiFetch/csrf only ever
// read `ok`, `status` and `json()` off the resolved value, so a full Response
// isn't needed — this single cast is the mock's own, not a general `any`.
function mockResponse(init: { ok: boolean; status: number; json: () => Promise<unknown> }): Response {
  return init as unknown as Response;
}

describe("ApiError", () => {
  it("asigna message, status y data en el constructor", () => {
    const data = { message: "Credenciales inválidas", errors: { email: ["requerido"] } };
    const error = new ApiError("Credenciales inválidas", 401, data);

    expect(error.message).toBe("Credenciales inválidas");
    expect(error.status).toBe(401);
    expect(error.data).toBe(data);
  });

  it("es instancia de Error y tiene name 'ApiError'", () => {
    const error = new ApiError("fallo", 500);

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("ApiError");
  });

  it("permite construirse sin data (parámetro opcional)", () => {
    const error = new ApiError("fallo sin data", 400);

    expect(error.data).toBeUndefined();
  });
});

describe("getXsrfToken", () => {
  afterEach(() => {
    // Clears the cookie so state doesn't leak between tests.
    document.cookie = "XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/";
  });

  it("devuelve el token decodificado cuando la cookie XSRF-TOKEN está presente", () => {
    document.cookie = "XSRF-TOKEN=token%3Dabc123";

    expect(getXsrfToken()).toBe("token=abc123");
  });

  it("devuelve null cuando la cookie XSRF-TOKEN no está presente", () => {
    expect(getXsrfToken()).toBeNull();
  });
});

describe("apiFetch", () => {
  // apiFetch and csrf() share module-level state (`csrfPromise`), so each test
  // gets its own fresh module instance via resetModules + dynamic import —
  // otherwise a 419-retry test would leave a cached CSRF promise behind that
  // leaks into unrelated tests and breaks their call-count assertions.
  let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;
  let apiFetch: typeof import("@/lib/api").apiFetch;
  // `resetModules` gives this describe its own instance of the module, so the
  // `ApiError` class thrown by that instance's `apiFetch` is a distinct class
  // from the one statically imported at the top of this file — `instanceof`
  // only works when checked against the class from the same instance.
  let ApiErrorFromModule: typeof import("@/lib/api").ApiError;
  const originalFetch = global.fetch;

  beforeEach(async () => {
    vi.resetModules();
    fetchMock = vi.fn<typeof fetch>();
    global.fetch = fetchMock;
    ({ apiFetch, ApiError: ApiErrorFromModule } = await import("@/lib/api"));
  });

  afterEach(() => {
    document.cookie = "XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/";
    global.fetch = originalFetch;
  });

  describe("armado de headers según el método", () => {
    it("en un GET implícito no incluye Content-Type, solo Accept y X-XSRF-TOKEN", async () => {
      // Arrange
      fetchMock.mockResolvedValueOnce(mockResponse({ ok: true, status: 200, json: async () => ({}) }));

      // Act
      await apiFetch("/api/x");

      // Assert
      const [, init] = fetchMock.mock.calls[0];
      const headers = init?.headers as Record<string, string>;
      expect(headers["Content-Type"]).toBeUndefined();
      expect(headers["Accept"]).toBe("application/json");
      expect(headers["X-XSRF-TOKEN"]).toBe("");
    });

    it("en un POST con body sí incluye Content-Type: application/json", async () => {
      // Arrange
      fetchMock.mockResolvedValueOnce(mockResponse({ ok: true, status: 200, json: async () => ({}) }));

      // Act
      await apiFetch("/api/x", { method: "POST", body: "{}" });

      // Assert
      const [, init] = fetchMock.mock.calls[0];
      const headers = init?.headers as Record<string, string>;
      expect(headers["Content-Type"]).toBe("application/json");
    });

    it("refleja en X-XSRF-TOKEN el valor devuelto por getXsrfToken()", async () => {
      // Arrange
      document.cookie = "XSRF-TOKEN=abc";
      fetchMock.mockResolvedValueOnce(mockResponse({ ok: true, status: 200, json: async () => ({}) }));

      // Act
      await apiFetch("/api/x");

      // Assert
      const [, init] = fetchMock.mock.calls[0];
      const headers = init?.headers as Record<string, string>;
      expect(headers["X-XSRF-TOKEN"]).toBe("abc");
    });
  });

  describe("respuestas exitosas y de error", () => {
    it("retorna el JSON parseado cuando la respuesta es ok", async () => {
      // Arrange
      fetchMock.mockResolvedValueOnce(
        mockResponse({ ok: true, status: 200, json: async () => ({ data: [1, 2, 3] }) }),
      );

      // Act
      const result = await apiFetch("/api/x");

      // Assert
      expect(result).toEqual({ data: [1, 2, 3] });
    });

    it("rechaza con ApiError usando el status y message del cuerpo cuando la respuesta no es ok", async () => {
      // Arrange
      fetchMock.mockResolvedValueOnce(
        mockResponse({
          ok: false,
          status: 422,
          json: async () => ({ message: "Inválido", errors: {} }),
        }),
      );

      // Act & Assert
      const error = await apiFetch("/api/x").catch((e: unknown) => e);
      expect(error).toBeInstanceOf(ApiErrorFromModule);
      expect((error as ApiError).status).toBe(422);
      expect((error as ApiError).message).toBe("Inválido");
    });

    it("cae al mensaje por defecto cuando el cuerpo de error no es JSON válido", async () => {
      // Arrange
      fetchMock.mockResolvedValueOnce(
        mockResponse({
          ok: false,
          status: 500,
          json: async () => {
            throw new Error("no json");
          },
        }),
      );

      // Act
      const error = (await apiFetch("/api/x").catch((e: unknown) => e)) as ApiError;

      // Assert
      expect(error).toBeInstanceOf(ApiErrorFromModule);
      expect(error.status).toBe(500);
      expect(error.message).toBe("Error 500 al consumir API");
    });
  });

  describe("reintento automático en 419", () => {
    it("invalida el CSRF cacheado, lo vuelve a pedir y reintenta la petición original una vez", async () => {
      // Arrange: 1st call is the original request (419), 2nd is the CSRF
      // cookie refresh triggered internally by the retry, 3rd is the retried
      // original request (now successful) — apiFetch awaits each in order,
      // so mockResolvedValueOnce queues them correctly by call order.
      fetchMock
        .mockResolvedValueOnce(mockResponse({ ok: false, status: 419, json: async () => ({}) }))
        .mockResolvedValueOnce(mockResponse({ ok: true, status: 200, json: async () => ({}) }))
        .mockResolvedValueOnce(mockResponse({ ok: true, status: 200, json: async () => ({ data: "ok" }) }));

      // Act
      const result = await apiFetch("/api/x");

      // Assert
      expect(result).toEqual({ data: "ok" });
      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(String(fetchMock.mock.calls[0][0])).toContain("/api/x");
      expect(String(fetchMock.mock.calls[1][0])).toContain("/sanctum/csrf-cookie");
      expect(String(fetchMock.mock.calls[2][0])).toContain("/api/x");
    });
  });
});

describe("csrf", () => {
  // Fresh module instance per test so the module-level `csrfPromise` cache
  // never leaks between these tests (see the note in the `apiFetch` describe).
  let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;
  let csrf: typeof import("@/lib/api").csrf;
  const originalFetch = global.fetch;

  beforeEach(async () => {
    vi.resetModules();
    fetchMock = vi.fn<typeof fetch>();
    global.fetch = fetchMock;
    ({ csrf } = await import("@/lib/api"));
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("cachea la promesa: dos llamadas consecutivas solo disparan un fetch a /sanctum/csrf-cookie", async () => {
    // Arrange
    fetchMock.mockResolvedValue(mockResponse({ ok: true, status: 200, json: async () => ({}) }));

    // Act: both calls start before either resolves, so the second must reuse
    // the cached promise rather than issue its own fetch.
    await Promise.all([csrf(), csrf()]);

    // Assert
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("si el fetch rechaza, limpia la promesa cacheada y la siguiente llamada dispara un fetch nuevo", async () => {
    // Arrange
    fetchMock.mockRejectedValueOnce(new Error("network error"));

    // Act & Assert: the first call rejects and must not leave a stale cached
    // promise behind.
    await expect(csrf()).rejects.toThrow("network error");

    fetchMock.mockResolvedValueOnce(mockResponse({ ok: true, status: 200, json: async () => ({}) }));
    await csrf();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
