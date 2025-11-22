import { createHash } from "crypto";

/**
 * Calculate SHA-256 hash of a file buffer
 * @param buffer - File buffer
 * @returns SHA-256 hash as hex string
 */
export function calculateFileHash(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

/**
 * Verify file hash
 * @param buffer - File buffer
 * @param expectedHash - Expected SHA-256 hash
 * @returns true if hash matches
 */
export function verifyFileHash(buffer: Buffer, expectedHash: string): boolean {
  const actualHash = calculateFileHash(buffer);
  return actualHash === expectedHash;
}
