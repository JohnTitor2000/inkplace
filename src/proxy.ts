import { getToken } from "next-auth/jwt"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { authSecret } from "@/lib/auth-secret"

export async function proxy(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: authSecret,
    secureCookie: request.nextUrl.protocol === "https:",
  })
  if (token) return NextResponse.next()
  const login = new URL("/login", request.url)
  login.searchParams.set(
    "callbackUrl",
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  )
  return NextResponse.redirect(login)
}

export const config = {
  matcher: ["/app", "/app/:path*"],
}
