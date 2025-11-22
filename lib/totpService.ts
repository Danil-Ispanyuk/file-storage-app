import { verifyBackupCode } from "@/lib/backupCodes";
import { decryptSecret } from "@/lib/encryption";
import { prismaClient } from "@/lib/prismaClient";
import { isValidTotpFormat, verifyTotpToken } from "@/lib/totp";

/**
 * Verify TOTP code or backup code for a user during login
 * @param userId - User ID
 * @param code - 6-digit TOTP code or 8-digit backup code
 * @returns true if valid, false otherwise
 */
export async function verifyTotpForUser(
  userId: string,
  code: string,
): Promise<{ valid: boolean; error?: string }> {
  // Get user's SecondFactor
  const secondFactor = await prismaClient.secondFactor.findUnique({
    where: { userId },
  });

  if (!secondFactor || !secondFactor.enabled || !secondFactor.secret) {
    return { valid: false, error: "2FA is not enabled for this user." };
  }

  // Check if code is backup code format (8 digits)
  const isBackupCodeFormat = /^\d{8}$/.test(code);
  const isTotpFormat = isValidTotpFormat(code);

  if (!isBackupCodeFormat && !isTotpFormat) {
    return {
      valid: false,
      error:
        "Invalid code format. Must be 6 digits (TOTP) or 8 digits (backup code).",
    };
  }

  // Try backup code first (if format matches)
  if (isBackupCodeFormat && secondFactor.backupCodes.length > 0) {
    const isValidBackup = await verifyBackupCode(
      code,
      secondFactor.backupCodes,
    );

    if (isValidBackup) {
      // Remove used backup code (one-time use)
      const usedCodeIndex = await Promise.all(
        secondFactor.backupCodes.map(async (hashedCode) => {
          return await verifyBackupCode(code, [hashedCode]);
        }),
      ).then((results) => results.findIndex((r) => r === true));

      const updatedBackupCodes =
        usedCodeIndex >= 0
          ? secondFactor.backupCodes.filter(
              (_, index) => index !== usedCodeIndex,
            )
          : secondFactor.backupCodes;

      // Update database with removed backup code
      await prismaClient.secondFactor.update({
        where: { userId },
        data: {
          lastVerifiedAt: new Date(),
          backupCodes: updatedBackupCodes,
        },
      });

      return { valid: true };
    }
  }

  // If not a backup code or backup code invalid, verify as TOTP code
  if (isTotpFormat) {
    // Decrypt the secret
    let decryptedSecret: string;
    try {
      decryptedSecret = decryptSecret(secondFactor.secret);
    } catch (error) {
      console.error("Error decrypting TOTP secret:", error);
      return { valid: false, error: "Error verifying code. Please try again." };
    }

    // Verify the TOTP code
    const isValid = verifyTotpToken(code, decryptedSecret);

    if (!isValid) {
      return { valid: false, error: "Invalid 2FA code." };
    }

    // Update last verified timestamp
    await prismaClient.secondFactor.update({
      where: { userId },
      data: { lastVerifiedAt: new Date() },
    });

    return { valid: true };
  }

  return { valid: false, error: "Invalid 2FA code." };
}

/**
 * Check if user has 2FA enabled
 * Returns false if error occurs (table doesn't exist, DB unavailable, etc.)
 */
export async function isUser2FAEnabled(userId: string): Promise<boolean> {
  try {
    const secondFactor = await prismaClient.secondFactor.findUnique({
      where: { userId },
      select: { enabled: true },
    });

    return secondFactor?.enabled ?? false;
  } catch (error: unknown) {
    // If table doesn't exist, DB unavailable, or any other error - return false
    // This allows the registration flow to continue
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Error checking 2FA status:", errorMessage);

    // If it's a connection error, we should still return false
    // to allow the app to continue (user will be redirected to 2FA setup)
    return false;
  }
}
