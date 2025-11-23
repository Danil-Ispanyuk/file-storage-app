import { NextRequest, NextResponse } from "next/server";

import {
  generateBackupCodes,
  hashBackupCodes,
  verifyBackupCode,
} from "@/lib/backupCodes";
import { log2FAEvent, logRateLimitExceeded } from "@/lib/auditLog";
import { requireAuthenticatedUser } from "@/lib/authGuard";
import { decryptSecret } from "@/lib/encryption";
import {
  checkRateLimit,
  getClientIP,
  twoFactorRateLimit,
} from "@/lib/rateLimit";
import { prismaClient } from "@/lib/prismaClient";
import { isValidTotpFormat, verifyTotpToken } from "@/lib/totp";
import { twoFactorVerificationsTotal } from "@/lib/metrics";

/**
 * POST /api/auth/2fa/verify
 * Verify TOTP code during 2FA setup or login
 * Requires authentication for setup verification
 */
export async function POST(request: NextRequest) {
  // Rate limiting: max 10 attempts per 15 minutes per IP
  const clientIP = getClientIP(request);
  const rateLimitResult = await checkRateLimit(twoFactorRateLimit, clientIP);

  if (!rateLimitResult.success) {
    // Log rate limit exceeded
    await logRateLimitExceeded(request, "/api/auth/2fa/verify", clientIP);

    const resetTime = rateLimitResult.reset
      ? new Date(rateLimitResult.reset).toISOString()
      : "soon";
    return NextResponse.json(
      {
        success: false,
        message: `Too many 2FA verification attempts. Please try again after ${resetTime}.`,
        rateLimitExceeded: true,
        reset: rateLimitResult.reset,
      },
      {
        status: 429,
        headers: {
          "Retry-After": rateLimitResult.reset
            ? String(Math.ceil((rateLimitResult.reset - Date.now()) / 1000))
            : "900",
          "X-RateLimit-Limit": String(rateLimitResult.limit ?? 10),
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
    const { code, isLogin } = body;

    // Validate code format
    if (!code || !isValidTotpFormat(code)) {
      return NextResponse.json(
        { success: false, message: "Invalid code format. Must be 6 digits." },
        { status: 400 },
      );
    }

    // If this is for login, we need userId from body (provided after password check)
    if (isLogin) {
      const { userId } = body;

      if (!userId) {
        return NextResponse.json(
          {
            success: false,
            message: "User ID is required for login verification.",
          },
          { status: 400 },
        );
      }

      // Get user's SecondFactor
      const secondFactor = await prismaClient.secondFactor.findUnique({
        where: { userId },
      });

      if (!secondFactor || !secondFactor.enabled || !secondFactor.secret) {
        return NextResponse.json(
          { success: false, message: "2FA is not enabled for this user." },
          { status: 400 },
        );
      }

      // Try to verify as backup code first (8 digits)
      const isBackupCodeFormat = /^\d{8}$/.test(code);
      let isValid = false;

      if (isBackupCodeFormat && secondFactor.backupCodes.length > 0) {
        // Verify as backup code
        isValid = await verifyBackupCode(code, secondFactor.backupCodes);

        if (isValid) {
          // Remove used backup code (one-time use)
          // Find which backup code was used and remove it
          const usedCodeIndex = await Promise.all(
            secondFactor.backupCodes.map(async (hashedCode) => {
              const matches = await verifyBackupCode(code, [hashedCode]);
              return matches;
            }),
          ).then((results) => results.findIndex((r) => r === true));

          const updatedBackupCodes =
            usedCodeIndex >= 0
              ? secondFactor.backupCodes.filter(
                  (_, index) => index !== usedCodeIndex,
                )
              : secondFactor.backupCodes;

          await prismaClient.secondFactor.update({
            where: { userId },
            data: {
              lastVerifiedAt: new Date(),
              backupCodes: updatedBackupCodes,
            },
          });

          // Log backup code usage
          twoFactorVerificationsTotal.inc({
            success: "true",
            method: "backup_code",
          });
          await log2FAEvent("BACKUP_CODE_USED", true, request, userId, {
            codeType: "backup",
          });

          return NextResponse.json({
            success: true,
            message: "Backup code verified successfully.",
          });
        }
      }

      // If not a backup code or backup code invalid, verify as TOTP code
      if (!isValid) {
        // Decrypt the secret
        const decryptedSecret = decryptSecret(secondFactor.secret);

        // Verify the TOTP code
        isValid = verifyTotpToken(code, decryptedSecret);

        if (!isValid) {
          // Log failed 2FA verification
          twoFactorVerificationsTotal.inc({ success: "false", method: "totp" });
          await log2FAEvent(
            "TWO_FACTOR_VERIFY_FAILED",
            false,
            request,
            userId,
            {
              codeType: "totp",
              error: "Invalid TOTP code",
            },
          );
          return NextResponse.json(
            { success: false, message: "Invalid 2FA code. Please try again." },
            { status: 401 },
          );
        }

        // Update last verified timestamp
        await prismaClient.secondFactor.update({
          where: { userId },
          data: { lastVerifiedAt: new Date() },
        });

        // Log successful 2FA verification
        twoFactorVerificationsTotal.inc({ success: "true", method: "totp" });
        await log2FAEvent("TWO_FACTOR_VERIFY_SUCCESS", true, request, userId, {
          codeType: "totp",
        });
      }

      return NextResponse.json({
        success: true,
        message: "2FA code verified successfully.",
      });
    }

    // For setup verification, require authentication
    const { session, response } = await requireAuthenticatedUser();
    if (!session) {
      return response;
    }

    const userId = session.user.id;

    // Get user's SecondFactor
    const secondFactor = await prismaClient.secondFactor.findUnique({
      where: { userId },
    });

    if (!secondFactor || !secondFactor.secret) {
      return NextResponse.json(
        {
          success: false,
          message: "2FA setup not found. Please run /api/auth/2fa/setup first.",
        },
        { status: 400 },
      );
    }

    // If already enabled, don't allow re-verification
    if (secondFactor.enabled) {
      return NextResponse.json(
        { success: false, message: "2FA is already enabled for this account." },
        { status: 400 },
      );
    }

    // Decrypt the secret
    const decryptedSecret = decryptSecret(secondFactor.secret);

    // Verify the TOTP code
    const isValid = verifyTotpToken(code, decryptedSecret);

    if (!isValid) {
      // Log failed 2FA setup verification
      twoFactorVerificationsTotal.inc({ success: "false", method: "totp" });
      await log2FAEvent("TWO_FACTOR_VERIFY_FAILED", false, request, userId, {
        codeType: "totp",
        context: "setup",
        error: "Invalid TOTP code during setup",
      });
      return NextResponse.json(
        { success: false, message: "Invalid code. Please try again." },
        { status: 401 },
      );
    }

    // Generate backup codes (only when first enabling 2FA)
    const backupCodes = generateBackupCodes();
    const hashedBackupCodes = await hashBackupCodes(backupCodes);

    // Enable 2FA and mark setup as complete, store backup codes
    await prismaClient.secondFactor.update({
      where: { userId },
      data: {
        enabled: true,
        setupComplete: true,
        lastVerifiedAt: new Date(),
        backupCodes: hashedBackupCodes,
      },
    });

    // Log successful 2FA setup
    await log2FAEvent("TWO_FACTOR_SETUP", true, request, userId, {
      codeType: "totp",
      backupCodesCount: backupCodes.length,
    });

    return NextResponse.json({
      success: true,
      message: "2FA has been successfully enabled for your account.",
      backupCodes, // Return plain codes only once - user should save them
    });
  } catch (error) {
    console.error("Error verifying 2FA code:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to verify 2FA code. Please try again.",
      },
      { status: 500 },
    );
  }
}
