import { NextResponse, type NextRequest } from "next/server"

const ACCESS_TOKEN_COOKIE = "sb-access-token"
const REFRESH_TOKEN_COOKIE = "sb-refresh-token"

const PUBLIC_ROUTES = new Set([
  "/login",
  "/signup",
])

function isStaticAsset(pathname: string): boolean {
  return (
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    /\.[a-zA-Z0-9]+$/.test(pathname)
  )
}

function isPublicApi(pathname: string): boolean {
  return pathname.startsWith("/api/auth/")
}

function isAuthConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY)
}

function isAuthRequired(): boolean {
  return process.env.AUTH_REQUIRED === "true"
}

function hasSessionCookie(request: NextRequest): boolean {
  return (
    request.cookies.has(ACCESS_TOKEN_COOKIE) ||
    request.cookies.has(REFRESH_TOKEN_COOKIE)
  )
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-pathname", pathname)

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  if (isStaticAsset(pathname) || isPublicApi(pathname)) {
    return response
  }

  const authActive = isAuthConfigured() && isAuthRequired()
  if (!authActive) {
    return response
  }

  const hasSession = hasSessionCookie(request)

  if (PUBLIC_ROUTES.has(pathname) && hasSession) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  if (PUBLIC_ROUTES.has(pathname)) {
    return response
  }

  if (!hasSession) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 })
    }

    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("next", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
}
