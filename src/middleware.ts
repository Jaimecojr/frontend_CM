import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();

  if (url.pathname.startsWith("/4dnn1n")) {
    try {
      const res = await fetch("http://localhost:8000/user", {
        method: "GET",
        credentials: "include",
        headers: {
          Cookie: req.headers.get("cookie") || "",
          Accept: "application/json",
        },
      });

      if (res.ok) return NextResponse.next();

      url.pathname = "/auth/sign-in";
      return NextResponse.redirect(url);
    } catch {
      url.pathname = "/auth/sign-in";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}
