import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth-edge";

const PROTECTED_PAGE_PREFIXES = [
  "/dashboard",
  "/pipeline",
  "/interview",
  "/curriculum",
];
const PROTECTED_API_PREFIXES = [
  "/api/agents",
  "/api/resume-parse",
  "/api/progress",
  "/api/curriculum",
];
const AUTH_PAGES = ["/login", "/signup"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  const isProtectedPage = PROTECTED_PAGE_PREFIXES.some((p) =>
    pathname.startsWith(p)
  );
  const isProtectedApi = PROTECTED_API_PREFIXES.some((p) =>
    pathname.startsWith(p)
  );
  const isAuthPage = AUTH_PAGES.some((p) => pathname.startsWith(p));

  if (isProtectedApi && !session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (isProtectedPage && !session) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthPage && session) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/pipeline/:path*",
    "/interview/:path*",
    "/curriculum/:path*",
    "/login",
    "/signup",
    "/api/agents/:path*",
    "/api/resume-parse",
    "/api/progress/:path*",
    "/api/curriculum/:path*",
  ],
};
