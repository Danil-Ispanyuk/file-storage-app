import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";

import { requireAuthenticatedUser } from "@/lib/authGuard";
import { log2FAEvent, logRateLimitExceeded } from "@/lib/auditLog";
import {
  checkRateLimit,
  getClientIP,
  twoFactorRateLimit,
} from "@/lib/rateLimit";
import { prismaClient } from "@/lib/prismaClient";
import { verifyTotpForUser } from "@/lib/totpService";

const STEP_UP_TOKEN_LENGTH = 32; // 32 bytes = 64 hex characters
const STEP_UP_EXPIRY_MINUTES = 15; // Step-up session expires in 15 minutes

/**
 * Generate secure step-up token
 */
function generateStepUpToken(): string {
  return randomBytes(STEP_UP_TOKEN_LENGTH).toString("hex");
}

/**
 * POST /api/auth/step-up
 * Verify 2FA code and create step-up session for critical operations
 */
export async function POST(request: NextRequest) {
  // Rate limiting: max 10 attempts per 15 minutes per IP
  const clientIP = getClientIP(request);
  const rateLimitResult = await checkRateLimit(twoFactorRateLimit, clientIP);

  if (!rateLimitResult.success) {
    await logRateLimitExceeded(request, "/api/auth/step-up", clientIP);

    return NextResponse.json(
      {
        success: false,
        message: "Too many step-up attempts. Please try again later.",
        rateLimitExceeded: true,
        reset: rateLimitResult.reset,
      },
      {
        status: 429,
        headers: {
          "Retry-After": rateLimitResult.reset
            ? String(Math.ceil((rateLimitResult.reset - Date.now()) / 1000))
            : "900",
        },
      },
    );
  }

  const { session, response } = await requireAuthenticatedUser();
  if (response) {
    return response;
  }

  const userId = session.user.id;

  try {
    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json(
        { success: false, message: "2FA code is required." },
        { status: 400 },
      );
    }

    // Verify 2FA code
    const verification = await verifyTotpForUser(userId, code);
    if (!verification.valid) {
      await log2FAEvent("TWO_FACTOR_VERIFY_FAILED", false, request, userId, {
        context: "step-up",
        error: verification.error,
      });

      return NextResponse.json(
        {
          success: false,
          message: verification.error || "Invalid 2FA code.",
        },
        { status: 401 },
      );
    }

    // Generate step-up token
    const token = generateStepUpToken();
    const expiresAt = new Date(Date.now() + STEP_UP_EXPIRY_MINUTES * 60 * 1000);

    // Store step-up session
    await prismaClient.stepUpSession.create({
      data: {
        userId,
        token,
        expiresAt,
      },
    });

    // Clean up expired sessions (optional, can be done via cron)
    await prismaClient.stepUpSession.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    // Log successful step-up
    await log2FAEvent("TWO_FACTOR_VERIFY_SUCCESS", true, request, userId, {
      context: "step-up",
    });

    return NextResponse.json(
      {
        success: true,
        message: "Step-up authentication successful.",
        token,
        expiresAt: expiresAt.toISOString(),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Step-up authentication error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to complete step-up authentication.",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

/**
 * Verify step-up token
 * @param userId - User ID
 * @param token - Step-up token
 * @returns true if valid, false otherwise
 */
export async function verifyStepUpToken(
  userId: string,
  token: string,
): Promise<boolean> {
  const session = await prismaClient.stepUpSession.findUnique({
    where: { token },
  });

  if (!session) {
    return false;
  }

  // Check if session belongs to user
  if (session.userId !== userId) {
    return false;
  }

  // Check if expired
  if (session.expiresAt < new Date()) {
    // Clean up expired session
    await prismaClient.stepUpSession.delete({
      where: { id: session.id },
    });
    return false;
  }

  return true;
}
