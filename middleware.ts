import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Security Headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com", // Allow CDN for PDF.js worker
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:", // Allow blob: for file previews
    "font-src 'self' data:",
    "connect-src 'self' blob:", // Allow blob: for PDF.js to load PDF from blob URLs
    "frame-src 'self' blob:", // Allow blob: for iframe (PDF, text files)
    "media-src 'self' blob:", // Allow blob: for video/audio
    "worker-src 'self' blob: https://cdnjs.cloudflare.com", // Allow PDF.js workers from blob URLs and CDN
    "frame-ancestors 'none'",
  ].join("; ");

  response.headers.set("Content-Security-Policy", csp);

  // Strict Transport Security (тільки для HTTPS в production)
  if (
    process.env.NODE_ENV === "production" &&
    request.url.startsWith("https://")
  ) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload",
    );
  }

  // Permissions Policy
  response.headers.set(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=(), payment=()",
  );

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
