import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(req: NextRequest) {
  const url = req.nextUrl.clone();

  if (url.pathname.startsWith("/4dnn1n")) {
    // Quick check for cookie presence, without calling the backend.
    // The actual session verification is done by useRequireAuth() on the client,
    // which does query /user against Laravel.
    //
    // HEADS UP: don't use XSRF-TOKEN here — Laravel sets it for any session
    // (authenticated or not) and it's never cleared on /logout, so it's almost
    // always present and this check would never redirect. "auth_hint" is
    // a custom cookie that the backend only sets on /login and clears on
    // /logout (see routes/web.php in api-cm).
    const hasSessionCookie = req.cookies.has("auth_hint");

    if (!hasSessionCookie) {
      url.pathname = "/auth/sign-in";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/4dnn1n/:path*"],
};
