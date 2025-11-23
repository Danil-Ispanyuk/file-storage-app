/**
 * Integration tests for complete file lifecycle
 * Tests the full flow: upload -> download -> delete
 */

import {
  generateFileKey,
  encryptFile,
  decryptFile,
  encryptFileKey,
  decryptFileKey,
  getMasterKey,
} from "@/lib/fileEncryption";
import { calculateFileHash, verifyFileHash } from "@/lib/fileHashing";
import { validateFile } from "@/lib/fileValidation";
import { generateRandomBuffer } from "../utils/testHelpers";

describe("File Lifecycle Integration Tests", () => {
  describe("Complete file encryption/decryption cycle", () => {
    it("should encrypt and decrypt file correctly", async () => {
      // Step 1: Create test file
      const originalContent = Buffer.from("test file content for encryption");
      const fileName = "test.txt";
      const mimeType = "text/plain";

      // Step 2: Validate file
      const validation = validateFile(
        originalContent.length,
        mimeType,
        fileName,
      );
      expect(validation.valid).toBe(true);

      // Step 3: Calculate hash
      const hash = calculateFileHash(originalContent);

      // Step 4: Generate file key
      const fileKey = generateFileKey();
      expect(fileKey.length).toBe(32);

      // Step 5: Encrypt file
      const { encrypted, iv, authTag } = await encryptFile(
        originalContent,
        fileKey,
      );
      expect(encrypted).toBeDefined();
      expect(iv.length).toBe(12);
      expect(authTag.length).toBe(16);

      // Step 6: Get master key
      const masterKey = getMasterKey();
      expect(masterKey.length).toBe(32);

      // Step 7: Encrypt file key
      const encryptedFileKey = encryptFileKey(fileKey, masterKey);
      expect(encryptedFileKey).toBeDefined();
      expect(encryptedFileKey).toContain(":"); // Format: IV:authTag:encrypted

      // Step 8: Decrypt file key
      const decryptedFileKey = decryptFileKey(encryptedFileKey, masterKey);
      expect(decryptedFileKey).toEqual(fileKey);

      // Step 9: Decrypt file
      const decryptedContent = await decryptFile(
        encrypted,
        decryptedFileKey,
        iv,
        authTag,
      );

      // Step 10: Verify content matches
      expect(decryptedContent).toEqual(originalContent);

      // Step 11: Verify hash
      const isValid = verifyFileHash(decryptedContent, hash);
      expect(isValid).toBe(true);
    });

    it("should handle large files", async () => {
      const largeContent = generateRandomBuffer(5 * 1024 * 1024); // 5MB
      const fileKey = generateFileKey();
      const masterKey = getMasterKey();

      // Encrypt
      const { encrypted, iv, authTag } = await encryptFile(
        largeContent,
        fileKey,
      );
      const encryptedFileKey = encryptFileKey(fileKey, masterKey);

      // Decrypt
      const decryptedFileKey = decryptFileKey(encryptedFileKey, masterKey);
      const decrypted = await decryptFile(
        encrypted,
        decryptedFileKey,
        iv,
        authTag,
      );

      // Verify
      expect(decrypted).toEqual(largeContent);
      const hash = calculateFileHash(largeContent);
      expect(verifyFileHash(decrypted, hash)).toBe(true);
    });

    it("should maintain file integrity through encryption cycle", async () => {
      const originalContent = Buffer.from("important document content");
      const fileKey = generateFileKey();
      const masterKey = getMasterKey();

      // Calculate original hash
      const originalHash = calculateFileHash(originalContent);

      // Encrypt
      const { encrypted, iv, authTag } = await encryptFile(
        originalContent,
        fileKey,
      );
      const encryptedFileKey = encryptFileKey(fileKey, masterKey);

      // Simulate storage and retrieval
      const storedEncrypted = encrypted;
      const storedEncryptedKey = encryptedFileKey;

      // Decrypt
      const decryptedFileKey = decryptFileKey(storedEncryptedKey, masterKey);
      const decrypted = await decryptFile(
        storedEncrypted,
        decryptedFileKey,
        iv,
        authTag,
      );

      // Verify integrity
      const decryptedHash = calculateFileHash(decrypted);
      expect(decryptedHash).toBe(originalHash);
      expect(verifyFileHash(decrypted, originalHash)).toBe(true);
    });
  });

  describe("File validation in lifecycle", () => {
    it("should validate file before encryption", () => {
      const validFile = {
        size: 1024 * 1024, // 1MB
        mimeType: "image/jpeg",
        fileName: "photo.jpg",
      };

      const validation = validateFile(
        validFile.size,
        validFile.mimeType,
        validFile.fileName,
      );
      expect(validation.valid).toBe(true);
    });

    it("should reject invalid files", () => {
      const invalidFile = {
        size: 101 * 1024 * 1024, // 101MB - exceeds limit
        mimeType: "application/x-executable",
        fileName: "virus.exe",
      };

      const validation = validateFile(
        invalidFile.size,
        invalidFile.mimeType,
        invalidFile.fileName,
      );
      expect(validation.valid).toBe(false);
    });
  });
});
