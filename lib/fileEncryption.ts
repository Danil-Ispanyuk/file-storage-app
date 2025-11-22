import { randomBytes, createCipheriv, createDecipheriv } from "crypto";
import { env } from "@/lib/env";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 12; // 96 bits for GCM

/**
 * Generate a random 256-bit key for file encryption
 */
export function generateFileKey(): Buffer {
  return randomBytes(KEY_LENGTH);
}

/**
 * Encrypt file encryption key with master key
 * Format: IV:authTag:encryptedKey (all hex encoded)
 */
export function encryptFileKey(fileKey: Buffer, masterKey: Buffer): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, masterKey, iv);

  const encrypted = Buffer.concat([cipher.update(fileKey), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Return as hex string: IV:authTag:encryptedKey
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypt file encryption key with master key
 */
export function decryptFileKey(
  encryptedKey: string,
  masterKey: Buffer,
): Buffer {
  const parts = encryptedKey.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted key format");
  }

  const iv = Buffer.from(parts[0], "hex");
  const authTag = Buffer.from(parts[1], "hex");
  const encrypted = Buffer.from(parts[2], "hex");

  const decipher = createDecipheriv(ALGORITHM, masterKey, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

/**
 * Encrypt file buffer
 * @returns Object with encrypted buffer, IV, and auth tag
 */
export async function encryptFile(
  buffer: Buffer,
  key: Buffer,
): Promise<{ encrypted: Buffer; iv: Buffer; authTag: Buffer }> {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return { encrypted, iv, authTag };
}

/**
 * Decrypt file buffer
 */
export async function decryptFile(
  encrypted: Buffer,
  key: Buffer,
  iv: Buffer,
  authTag: Buffer,
): Promise<Buffer> {
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

/**
 * Get master key from environment variable
 * Converts hex string to Buffer or uses UTF-8 if not hex
 */
export function getMasterKey(): Buffer {
  const key = env.FILE_ENCRYPTION_KEY;

  // Try to parse as hex, if it fails, use as UTF-8
  try {
    if (key.length === 64) {
      // 32 bytes = 64 hex chars
      return Buffer.from(key, "hex");
    }
  } catch {
    // Fall through to UTF-8
  }

  // Use as UTF-8 string and pad/truncate to 32 bytes
  const keyBuffer = Buffer.from(key, "utf-8");
  if (keyBuffer.length < KEY_LENGTH) {
    // Pad with zeros if too short
    return Buffer.concat([
      keyBuffer,
      Buffer.alloc(KEY_LENGTH - keyBuffer.length),
    ]);
  }
  return keyBuffer.slice(0, KEY_LENGTH);
}
