import { calculateFileHash, verifyFileHash } from "@/lib/fileHashing";
import { generateRandomBuffer } from "../utils/testHelpers";

describe("fileHashing", () => {
  describe("calculateFileHash", () => {
    it("should calculate SHA-256 hash for a buffer", () => {
      const buffer = Buffer.from("test file content");
      const hash = calculateFileHash(buffer);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe("string");
      expect(hash.length).toBe(64); // SHA-256 produces 64 hex characters
    });

    it("should produce consistent hashes for the same content", () => {
      const buffer = Buffer.from("same content");
      const hash1 = calculateFileHash(buffer);
      const hash2 = calculateFileHash(buffer);

      expect(hash1).toBe(hash2);
    });

    it("should produce different hashes for different content", () => {
      const buffer1 = Buffer.from("content 1");
      const buffer2 = Buffer.from("content 2");
      const hash1 = calculateFileHash(buffer1);
      const hash2 = calculateFileHash(buffer2);

      expect(hash1).not.toBe(hash2);
    });

    it("should handle empty buffer", () => {
      const buffer = Buffer.alloc(0);
      const hash = calculateFileHash(buffer);

      expect(hash).toBeDefined();
      expect(hash.length).toBe(64);
    });

    it("should handle large buffers", () => {
      const buffer = generateRandomBuffer(10 * 1024 * 1024); // 10MB
      const hash = calculateFileHash(buffer);

      expect(hash).toBeDefined();
      expect(hash.length).toBe(64);
    });
  });

  describe("verifyFileHash", () => {
    it("should return true for matching hash", () => {
      const buffer = Buffer.from("test content");
      const hash = calculateFileHash(buffer);
      const isValid = verifyFileHash(buffer, hash);

      expect(isValid).toBe(true);
    });

    it("should return false for non-matching hash", () => {
      const buffer = Buffer.from("test content");
      const wrongHash = "a".repeat(64); // Wrong hash
      const isValid = verifyFileHash(buffer, wrongHash);

      expect(isValid).toBe(false);
    });

    it("should return false for corrupted buffer", () => {
      const originalBuffer = Buffer.from("original content");
      const hash = calculateFileHash(originalBuffer);
      const corruptedBuffer = Buffer.from("corrupted content");
      const isValid = verifyFileHash(corruptedBuffer, hash);

      expect(isValid).toBe(false);
    });

    it("should handle empty buffer", () => {
      const buffer = Buffer.alloc(0);
      const hash = calculateFileHash(buffer);
      const isValid = verifyFileHash(buffer, hash);

      expect(isValid).toBe(true);
    });
  });
});
