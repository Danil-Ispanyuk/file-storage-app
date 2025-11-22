import { authenticator } from "otplib";
import QRCode from "qrcode";

// Configure TOTP with RFC 6238 standard settings
authenticator.options = {
  window: [1, 1], // Allow 1 time step before and after current time
  step: 30, // 30 seconds time step (standard)
};

/**
 * Generate a new TOTP secret for a user
 * @returns Base32 encoded secret string
 */
export function generateTotpSecret(): string {
  return authenticator.generateSecret();
}

/**
 * Generate a TOTP URL for QR code (otpauth://totp/...)
 * @param secret - Base32 encoded secret
 * @param email - User's email
 * @param issuer - Service name (default: "File Storage App")
 */
export function generateTotpUrl(
  secret: string,
  email: string,
  issuer: string = "File Storage App",
): string {
  return authenticator.keyuri(email, issuer, secret);
}

/**
 * Generate QR code as data URL (base64)
 * @param url - TOTP URL (otpauth://totp/...)
 * @returns Promise resolving to data URL string
 */
export async function generateQrCodeDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: "M",
    type: "image/png",
    width: 300,
    margin: 2,
  });
}

/**
 * Verify a TOTP token against a secret
 * @param token - 6-digit code from user's authenticator app
 * @param secret - Base32 encoded secret
 * @returns true if token is valid, false otherwise
 */
export function verifyTotpToken(token: string, secret: string): boolean {
  try {
    return authenticator.verify({ token, secret });
  } catch {
    return false;
  }
}

/**
 * Check if a token string is valid format (6 digits)
 */
export function isValidTotpFormat(token: string): boolean {
  return /^\d{6}$/.test(token);
}
