import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(req: NextRequest) {
  const url = req.nextUrl.clone();

  if (url.pathname.startsWith("/4dnn1n")) {
    // Verificación rápida de presencia de cookie, sin llamar al backend.
    // La verificación real de sesión la hace useRequireAuth() en el cliente,
    // que sí consulta /user contra Laravel.
    //
    // OJO: no usar XSRF-TOKEN aquí — Laravel la setea para cualquier sesión
    // (autenticada o no) y nunca se borra en /logout, así que casi siempre
    // está presente y esta verificación nunca redirigiría. "auth_hint" es
    // una cookie propia que el backend solo pone en /login y borra en
    // /logout (ver routes/web.php en api-cm).
    const tieneCookieSesion = req.cookies.has("auth_hint");

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
