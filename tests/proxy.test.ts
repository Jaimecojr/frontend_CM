import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy, config } from "@/proxy";

/**
 * Builds a NextRequest for a given pathname, optionally carrying the
 * `auth_hint` cookie via a raw `cookie` header (NextRequest parses it into
 * `req.cookies` automatically).
 */
function buildRequest(pathname: string, { withAuthHint = false } = {}) {
  const headers = withAuthHint ? new Headers({ cookie: "auth_hint=1" }) : new Headers();
  return new NextRequest(`http://localhost:3000${pathname}`, { headers });
}

describe("proxy", () => {
  describe("rutas bajo /4dnn1n", () => {
    it("redirige a /auth/sign-in cuando no hay cookie auth_hint", () => {
      // Arrange
      const req = buildRequest("/4dnn1n/home", { withAuthHint: false });

      // Act
      const res = proxy(req);

      // Assert
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe("http://localhost:3000/auth/sign-in");
    });

    it("deja pasar la petición cuando la cookie auth_hint está presente", () => {
      // Arrange
      const req = buildRequest("/4dnn1n/home", { withAuthHint: true });

      // Act
      const res = proxy(req);

      // Assert: NextResponse.next() no es una redirección y trae el header
      // interno x-middleware-next que la caracteriza.
      expect(res.status).not.toBe(307);
      expect(res.headers.get("location")).toBeNull();
      expect(res.headers.get("x-middleware-next")).toBe("1");
    });
  });

  describe("rutas fuera de /4dnn1n", () => {
    it("deja pasar /web sin importar la cookie auth_hint", () => {
      // Arrange: con cookie presente, para cubrir el otro estado posible junto
      // con el caso sin cookie que prueba /auth/sign-in más abajo.
      const req = buildRequest("/web", { withAuthHint: true });

      // Act
      const res = proxy(req);

      // Assert
      expect(res.status).not.toBe(307);
      expect(res.headers.get("x-middleware-next")).toBe("1");
    });

    it("deja pasar /auth/sign-in sin redirigir de nuevo, incluso sin cookie", () => {
      // Arrange
      const req = buildRequest("/auth/sign-in", { withAuthHint: false });

      // Act
      const res = proxy(req);

      // Assert
      expect(res.status).not.toBe(307);
      expect(res.headers.get("x-middleware-next")).toBe("1");
    });
  });

  describe("config.matcher", () => {
    it("está configurado para interceptar solo rutas bajo /4dnn1n", () => {
      expect(config.matcher).toEqual(["/4dnn1n/:path*"]);
    });
  });
});
