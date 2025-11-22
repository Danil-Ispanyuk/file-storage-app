import crypto from "crypto";

import { env } from "@/lib/env";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits

/**
 * Derive encryption key from AUTH_SECRET using PBKDF2
 * This ensures we have a consistent 256-bit key for AES-256-GCM
 */
function getEncryptionKey(): Buffer {
  const salt = "totp-secret-encryption-salt"; // In production, store this in env
  return crypto.pbkdf2Sync(env.AUTH_SECRET, salt, 100000, KEY_LENGTH, "sha256");
}

/**
 * Encrypts a plaintext string using AES-256-GCM
 * Returns a hex string containing IV + authTag + ciphertext
 */
export function encryptSecret(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  // Combine IV + authTag + encrypted data
  return iv.toString("hex") + ":" + authTag.toString("hex") + ":" + encrypted;
}

/**
 * Decrypts an encrypted string using AES-256-GCM
 * Expects format: IV:authTag:ciphertext (all in hex)
 */
export function decryptSecret(encryptedData: string): string {
  const key = getEncryptionKey();
  const parts = encryptedData.split(":");

  if (parts.length !== 3) {
    throw new Error("Invalid encrypted data format");
  }

  const iv = Buffer.from(parts[0]!, "hex");
  const authTag = Buffer.from(parts[1]!, "hex");
  const encrypted = parts[2]!;

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
