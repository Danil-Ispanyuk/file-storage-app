import { NextResponse } from "next/server";

import { requireAuthenticatedUser } from "@/lib/authGuard";
import { encryptSecret } from "@/lib/encryption";
import { prismaClient } from "@/lib/prismaClient";
import {
  generateQrCodeDataUrl,
  generateTotpSecret,
  generateTotpUrl,
} from "@/lib/totp";

/**
 * POST /api/auth/2fa/setup
 * Generate TOTP secret and QR code for 2FA setup
 * Requires authentication
 */
export async function POST() {
  // Check authentication
  const { session, response } = await requireAuthenticatedUser();
  if (!session) {
    return response;
  }

  try {
    const userId = session.user.id;

    // Generate new TOTP secret
    const secret = generateTotpSecret();

    // Encrypt the secret before storing
    const encryptedSecret = encryptSecret(secret);

    // Get user email or use user ID as identifier
    const userEmail = session.user.email ?? session.user.id;

    // Generate TOTP URL for QR code
    const totpUrl = generateTotpUrl(secret, userEmail, "File Storage App");

    // Generate QR code as data URL
    const qrCodeDataUrl = await generateQrCodeDataUrl(totpUrl);

    // Upsert SecondFactor record (create or update)
    await prismaClient.secondFactor.upsert({
      where: { userId },
      create: {
        userId,
        type: "TOTP",
        secret: encryptedSecret,
        enabled: false, // Not enabled until user verifies with a code
        setupComplete: false,
      },
      update: {
        secret: encryptedSecret,
        enabled: false, // Reset enabled status when regenerating
        setupComplete: false,
        backupCodes: [], // Clear backup codes when regenerating
      },
    });

    return NextResponse.json({
      success: true,
      secret, // Send plain secret for manual entry if QR code doesn't work
      qrCode: qrCodeDataUrl, // Data URL for QR code image
      otpAuthUrl: totpUrl, // Full otpauth:// URL
      message:
        "2FA setup initiated. Please scan the QR code or enter the secret manually, then verify with a code.",
    });
  } catch (error) {
    console.error("Error setting up 2FA:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to generate 2FA setup. Please try again.",
      },
      { status: 500 },
    );
  }
}
