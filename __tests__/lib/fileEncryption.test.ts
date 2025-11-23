import {
  generateFileKey,
  encryptFileKey,
  decryptFileKey,
  encryptFile,
  decryptFile,
  getMasterKey,
} from "@/lib/fileEncryption";
import { generateRandomBuffer } from "../utils/testHelpers";

describe("fileEncryption", () => {
  describe("generateFileKey", () => {
    it("should generate a 32-byte key", () => {
      const key = generateFileKey();
      expect(key.length).toBe(32);
    });

    it("should generate unique keys", () => {
      const key1 = generateFileKey();
      const key2 = generateFileKey();
      expect(key1).not.toEqual(key2);
    });

    it("should generate random keys", () => {
      const keys = new Set<string>();
      for (let i = 0; i < 100; i++) {
        keys.add(generateFileKey().toString("hex"));
      }
      // All keys should be unique
      expect(keys.size).toBe(100);
    });
  });

  describe("encryptFileKey and decryptFileKey", () => {
    let masterKey: Buffer;

    beforeEach(() => {
      // Generate a test master key
      masterKey = Buffer.alloc(32).fill(0x42);
    });

    it("should encrypt and decrypt file key correctly", () => {
      const fileKey = generateFileKey();
      const encrypted = encryptFileKey(fileKey, masterKey);
      const decrypted = decryptFileKey(encrypted, masterKey);

      expect(decrypted).toEqual(fileKey);
    });

    it("should produce different encrypted keys for same file key", () => {
      const fileKey = generateFileKey();
      const encrypted1 = encryptFileKey(fileKey, masterKey);
      const encrypted2 = encryptFileKey(fileKey, masterKey);

      // Due to random IV, encrypted keys should be different
      expect(encrypted1).not.toBe(encrypted2);
    });

    it("should fail to decrypt with wrong master key", () => {
      const fileKey = generateFileKey();
      const encrypted = encryptFileKey(fileKey, masterKey);
      const wrongMasterKey = Buffer.alloc(32).fill(0x43);

      expect(() => {
        decryptFileKey(encrypted, wrongMasterKey);
      }).toThrow();
    });

    it("should fail to decrypt with invalid format", () => {
      expect(() => {
        decryptFileKey("invalid-format", masterKey);
      }).toThrow("Invalid encrypted key format");
    });

    it("should fail to decrypt with corrupted encrypted key", () => {
      const fileKey = generateFileKey();
      const encrypted = encryptFileKey(fileKey, masterKey);
      const corrupted = encrypted.replace(/^.{2}/, "XX"); // Corrupt first part

      expect(() => {
        decryptFileKey(corrupted, masterKey);
      }).toThrow();
    });

    it("should handle different file keys", () => {
      const key1 = generateFileKey();
      const key2 = generateFileKey();

      const encrypted1 = encryptFileKey(key1, masterKey);
      const encrypted2 = encryptFileKey(key2, masterKey);

      const decrypted1 = decryptFileKey(encrypted1, masterKey);
      const decrypted2 = decryptFileKey(encrypted2, masterKey);

      expect(decrypted1).toEqual(key1);
      expect(decrypted2).toEqual(key2);
      expect(decrypted1).not.toEqual(decrypted2);
    });
  });

  describe("encryptFile and decryptFile", () => {
    let fileKey: Buffer;

    beforeEach(() => {
      fileKey = generateFileKey();
    });

    it("should encrypt and decrypt file correctly", async () => {
      const originalBuffer = Buffer.from("test file content");
      const { encrypted, iv, authTag } = await encryptFile(
        originalBuffer,
        fileKey,
      );
      const decrypted = await decryptFile(encrypted, fileKey, iv, authTag);

      expect(decrypted).toEqual(originalBuffer);
    });

    it("should produce different encrypted data for same content", async () => {
      const originalBuffer = Buffer.from("test content");
      const result1 = await encryptFile(originalBuffer, fileKey);
      const result2 = await encryptFile(originalBuffer, fileKey);

      // Due to random IV, encrypted data should be different
      expect(result1.encrypted).not.toEqual(result2.encrypted);
      expect(result1.iv).not.toEqual(result2.iv);
    });

    it("should handle empty buffer", async () => {
      const originalBuffer = Buffer.alloc(0);
      const { encrypted, iv, authTag } = await encryptFile(
        originalBuffer,
        fileKey,
      );
      const decrypted = await decryptFile(encrypted, fileKey, iv, authTag);

      expect(decrypted).toEqual(originalBuffer);
    });

    it("should handle large buffers", async () => {
      const originalBuffer = generateRandomBuffer(10 * 1024 * 1024); // 10MB
      const { encrypted, iv, authTag } = await encryptFile(
        originalBuffer,
        fileKey,
      );
      const decrypted = await decryptFile(encrypted, fileKey, iv, authTag);

      expect(decrypted).toEqual(originalBuffer);
    });

    it("should fail to decrypt with wrong key", async () => {
      const originalBuffer = Buffer.from("test content");
      const { encrypted, iv, authTag } = await encryptFile(
        originalBuffer,
        fileKey,
      );
      const wrongKey = generateFileKey();

      await expect(
        decryptFile(encrypted, wrongKey, iv, authTag),
      ).rejects.toThrow();
    });

    it("should fail to decrypt with wrong IV", async () => {
      const originalBuffer = Buffer.from("test content");
      const { encrypted, authTag } = await encryptFile(originalBuffer, fileKey);
      const wrongIv = generateFileKey().slice(0, 12); // Wrong IV

      await expect(
        decryptFile(encrypted, fileKey, wrongIv, authTag),
      ).rejects.toThrow();
    });

    it("should fail to decrypt with wrong auth tag", async () => {
      const originalBuffer = Buffer.from("test content");
      const { encrypted, iv } = await encryptFile(originalBuffer, fileKey);
      const wrongAuthTag = Buffer.alloc(16).fill(0x00); // Wrong auth tag

      await expect(
        decryptFile(encrypted, fileKey, iv, wrongAuthTag),
      ).rejects.toThrow();
    });

    it("should fail to decrypt corrupted encrypted data", async () => {
      const originalBuffer = Buffer.from("test content");
      const { encrypted, iv, authTag } = await encryptFile(
        originalBuffer,
        fileKey,
      );
      const corrupted = Buffer.from(encrypted);
      corrupted[0] = (corrupted[0]! + 1) % 256; // Corrupt first byte

      await expect(
        decryptFile(corrupted, fileKey, iv, authTag),
      ).rejects.toThrow();
    });

    it("should produce IV of correct length", async () => {
      const originalBuffer = Buffer.from("test content");
      const { iv } = await encryptFile(originalBuffer, fileKey);

      expect(iv.length).toBe(12); // 96 bits for GCM
    });

    it("should produce auth tag of correct length", async () => {
      const originalBuffer = Buffer.from("test content");
      const { authTag } = await encryptFile(originalBuffer, fileKey);

      expect(authTag.length).toBe(16); // 128 bits for GCM auth tag
    });
  });

  describe("getMasterKey", () => {
    it("should return a 32-byte key", () => {
      const key = getMasterKey();
      expect(key.length).toBe(32);
    });

    it("should return consistent key for same environment", () => {
      const key1 = getMasterKey();
      const key2 = getMasterKey();
      // Key should be consistent (from env variable)
      expect(key1).toEqual(key2);
    });

    it("should return a valid buffer", () => {
      const key = getMasterKey();
      expect(Buffer.isBuffer(key)).toBe(true);
      expect(key.length).toBe(32);
    });
  });

  describe("integration: full encryption cycle", () => {
    it("should encrypt file, encrypt file key, and decrypt correctly", async () => {
      const masterKey = getMasterKey();
      const fileKey = generateFileKey();
      const originalBuffer = Buffer.from("test file content");

      // Encrypt file
      const { encrypted, iv, authTag } = await encryptFile(
        originalBuffer,
        fileKey,
      );

      // Encrypt file key
      const encryptedFileKey = encryptFileKey(fileKey, masterKey);

      // Decrypt file key
      const decryptedFileKey = decryptFileKey(encryptedFileKey, masterKey);

      // Decrypt file
      const decryptedBuffer = await decryptFile(
        encrypted,
        decryptedFileKey,
        iv,
        authTag,
      );

      expect(decryptedBuffer).toEqual(originalBuffer);
    });
  });
});
