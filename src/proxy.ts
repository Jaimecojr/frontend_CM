import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(req: NextRequest) {
  const url = req.nextUrl.clone();

  if (url.pathname.startsWith("/4dnn1n")) {
    // Verificación rápida de presencia de cookie, sin llamar al backend.
    // La verificación real de sesión la hace useRequireAuth() en el cliente,
    // que sí consulta /user contra Laravel.
    const tieneCookieSesion = req.cookies.has("XSRF-TOKEN");

    if (!tieneCookieSesion) {
      url.pathname = "/auth/sign-in";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/4dnn1n/:path*"],
};
