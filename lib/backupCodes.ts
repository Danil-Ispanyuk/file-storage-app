import bcrypt from "bcryptjs";

const BACKUP_CODES_COUNT = 10; // Generate 10 backup codes
const SALT_ROUNDS = 10; // Lower than password hashing since backup codes are longer

/**
 * Generate a single backup code (8-digit numeric code)
 */
function generateBackupCode(): string {
  // Generate 8-digit code: 00000000 to 99999999
  const min = 10000000;
  const max = 99999999;
  const code = Math.floor(Math.random() * (max - min + 1)) + min;
  return code.toString().padStart(8, "0");
}

/**
 * Generate multiple backup codes for a user
 * @param count - Number of codes to generate (default: 10)
 * @returns Array of plain text backup codes
 */
export function generateBackupCodes(
  count: number = BACKUP_CODES_COUNT,
): string[] {
  const codes: string[] = [];
  const usedCodes = new Set<string>();

  while (codes.length < count) {
    const code = generateBackupCode();
    // Ensure uniqueness
    if (!usedCodes.has(code)) {
      codes.push(code);
      usedCodes.add(code);
    }
  }

  return codes;
}

/**
 * Hash a backup code using bcrypt
 * @param code - Plain text backup code
 * @returns Hashed code
 */
export async function hashBackupCode(code: string): Promise<string> {
  return bcrypt.hash(code, SALT_ROUNDS);
}

/**
 * Hash multiple backup codes
 * @param codes - Array of plain text backup codes
 * @returns Array of hashed codes
 */
export async function hashBackupCodes(codes: string[]): Promise<string[]> {
  return Promise.all(codes.map((code) => hashBackupCode(code)));
}

/**
 * Verify a backup code against an array of hashed codes
 * @param code - Plain text code to verify
 * @param hashedCodes - Array of hashed backup codes
 * @returns true if code matches any hashed code, false otherwise
 */
export async function verifyBackupCode(
  code: string,
  hashedCodes: string[],
): Promise<boolean> {
  // Try to match against all hashed codes
  for (const hashedCode of hashedCodes) {
    try {
      const isValid = await bcrypt.compare(code, hashedCode);
      if (isValid) {
        return true;
      }
    } catch {
      // Continue to next code if comparison fails
      continue;
    }
  }
  return false;
}
