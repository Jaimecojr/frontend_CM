import { afterEach, describe, expect, it } from "vitest";
import { ApiError, getXsrfToken } from "@/lib/api";

// csrf() y apiFetch() hacen fetch real y quedan fuera de esta tarea — ver
// nota en el reporte de la Tarea 7 (dejado como brecha aceptada por el
// controller ruling del plan).

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
    // Limpia la cookie para no filtrar estado entre tests.
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
