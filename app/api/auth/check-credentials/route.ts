import { NextRequest, NextResponse } from "next/server";

import { logAuthEvent } from "@/lib/auditLog";
import { verifyPassword } from "@/lib/passwordManager";
import { checkRateLimit, getClientIP, loginRateLimit } from "@/lib/rateLimit";
import { prismaClient } from "@/lib/prismaClient";
import { authAttemptsTotal } from "@/lib/metrics";

/**
 * POST /api/auth/check-credentials
 * Check if credentials are valid and if 2FA is required
 * Returns userId if password is valid and 2FA status
 */
export async function POST(request: NextRequest) {
  // Rate limiting: max 5 attempts per 15 minutes per IP
  const clientIP = getClientIP(request);
  const rateLimitResult = await checkRateLimit(loginRateLimit, clientIP);

  if (!rateLimitResult.success) {
    // Log rate limit exceeded
    const { logRateLimitExceeded } = await import("@/lib/auditLog");
    await logRateLimitExceeded(
      request,
      "/api/auth/check-credentials",
      clientIP,
    );

    const resetTime = rateLimitResult.reset
      ? new Date(rateLimitResult.reset).toISOString()
      : "soon";
    return NextResponse.json(
      {
        success: false,
        message: `Too many login attempts. Please try again after ${resetTime}.`,
        rateLimitExceeded: true,
        reset: rateLimitResult.reset,
      },
      {
        status: 429,
        headers: {
          "Retry-After": rateLimitResult.reset
            ? String(Math.ceil((rateLimitResult.reset - Date.now()) / 1000))
            : "900",
          "X-RateLimit-Limit": String(rateLimitResult.limit ?? 5),
          "X-RateLimit-Remaining": String(rateLimitResult.remaining ?? 0),
          "X-RateLimit-Reset": String(
            rateLimitResult.reset ?? Date.now() + 900000,
          ),
        },
      },
    );
  }

  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "Email and password are required." },
        { status: 400 },
      );
    }

    // Find user
    const user = await prismaClient.user.findUnique({
      where: { email },
      include: { secondFactor: true },
    });

    if (!user?.password) {
      // Log failed login attempt
      authAttemptsTotal.inc({ type: "login", success: "false" });
      await logAuthEvent("LOGIN_FAILED", false, request, null, {
        email,
        error: "User not found",
      });
      return NextResponse.json(
        { success: false, message: "Invalid credentials." },
        { status: 401 },
      );
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password);

    if (!isPasswordValid) {
      // Log failed login attempt
      authAttemptsTotal.inc({ type: "login", success: "false" });
      await logAuthEvent("LOGIN_FAILED", false, request, user.id, {
        email,
        error: "Invalid password",
      });
      return NextResponse.json(
        { success: false, message: "Invalid credentials." },
        { status: 401 },
      );
    }

    // Check if 2FA is enabled
    const has2FAEnabled = user.secondFactor?.enabled ?? false;

    // Log successful password verification (but not full login yet if 2FA is required)
    if (!has2FAEnabled) {
      // If no 2FA, this is a successful login
      authAttemptsTotal.inc({ type: "login", success: "true" });
      await logAuthEvent("LOGIN_SUCCESS", true, request, user.id, {
        email,
      });
    } else {
      // If 2FA is required, log partial success (password correct, waiting for 2FA)
      await logAuthEvent("LOGIN_SUCCESS", true, request, user.id, {
        email,
        requires2FA: true,
      });
    }

    return NextResponse.json({
      success: true,
      userId: user.id,
      requires2FA: has2FAEnabled,
      message: has2FAEnabled
        ? "Password valid. 2FA code required."
        : "Password valid.",
    });
  } catch (error) {
    console.error("Error checking credentials:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to verify credentials. Please try again.",
      },
      { status: 500 },
    );
  }
}
