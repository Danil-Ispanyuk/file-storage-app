import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export default function proxy(request: NextRequest) {
  const { nextUrl, cookies } = request;
  const pathname = nextUrl.pathname;

  const isAuthRoute =
    pathname.startsWith("/auth/login") || pathname.startsWith("/auth/register");

  // Allow access to 2FA settings even without 2FA enabled (user needs to set it up)
  const is2FASettingsRoute = pathname.startsWith("/settings/2fa");

  // Heuristic: presence of next-auth session cookie implies an active session.
  // Database sessions are validated on the server page (`app/page.tsx`) anyway.
  const hasSessionCookie =
    cookies.has("next-auth.session-token") ||
    cookies.has("__Secure-next-auth.session-token");

  if (hasSessionCookie && isAuthRoute) {
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  // Allow 2FA settings route if user has session (they need to set it up)
  if (!hasSessionCookie && !isAuthRoute && !is2FASettingsRoute) {
    return NextResponse.redirect(new URL("/auth/login", nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
