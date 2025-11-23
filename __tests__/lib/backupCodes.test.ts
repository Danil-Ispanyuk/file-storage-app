import {
  generateBackupCodes,
  hashBackupCode,
  hashBackupCodes,
  verifyBackupCode,
} from "@/lib/backupCodes";

describe("backupCodes", () => {
  describe("generateBackupCodes", () => {
    it("should generate default number of codes", () => {
      const codes = generateBackupCodes();
      expect(codes.length).toBe(10);
    });

    it("should generate specified number of codes", () => {
      const codes = generateBackupCodes(5);
      expect(codes.length).toBe(5);
    });

    it("should generate 8-digit codes", () => {
      const codes = generateBackupCodes(10);
      codes.forEach((code) => {
        expect(code).toMatch(/^\d{8}$/);
        expect(code.length).toBe(8);
      });
    });

    it("should generate unique codes", () => {
      const codes = generateBackupCodes(100);
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(codes.length);
    });

    it("should generate codes in valid range", () => {
      const codes = generateBackupCodes(100);
      codes.forEach((code) => {
        const num = parseInt(code, 10);
        expect(num).toBeGreaterThanOrEqual(10000000);
        expect(num).toBeLessThanOrEqual(99999999);
      });
    });
  });

  describe("hashBackupCode", () => {
    it("should hash a backup code", async () => {
      const code = "12345678";
      const hashed = await hashBackupCode(code);

      expect(hashed).toBeDefined();
      expect(typeof hashed).toBe("string");
      expect(hashed).not.toBe(code);
      expect(hashed.length).toBeGreaterThan(0);
    });

    it("should produce different hashes for same code (salt)", async () => {
      const code = "12345678";
      const hashed1 = await hashBackupCode(code);
      const hashed2 = await hashBackupCode(code);

      // Due to salt, hashes should be different
      expect(hashed1).not.toBe(hashed2);
    });
  });

  describe("hashBackupCodes", () => {
    it("should hash multiple codes", async () => {
      const codes = ["11111111", "22222222", "33333333"];
      const hashed = await hashBackupCodes(codes);

      expect(hashed.length).toBe(codes.length);
      hashed.forEach((hash) => {
        expect(hash).toBeDefined();
        expect(typeof hash).toBe("string");
      });
    });

    it("should hash all codes independently", async () => {
      const codes = generateBackupCodes(5);
      const hashed = await hashBackupCodes(codes);

      expect(hashed.length).toBe(codes.length);
      // All hashes should be different
      const uniqueHashes = new Set(hashed);
      expect(uniqueHashes.size).toBe(hashed.length);
    });
  });

  describe("verifyBackupCode", () => {
    it("should verify a correct backup code", async () => {
      const code = "12345678";
      const hashed = await hashBackupCode(code);
      const isValid = await verifyBackupCode(code, [hashed]);

      expect(isValid).toBe(true);
    });

    it("should reject an incorrect backup code", async () => {
      const code = "12345678";
      const hashed = await hashBackupCode(code);
      const isValid = await verifyBackupCode("87654321", [hashed]);

      expect(isValid).toBe(false);
    });

    it("should verify code against multiple hashed codes", async () => {
      const codes = ["11111111", "22222222", "33333333"];
      const hashed = await hashBackupCodes(codes);

      // Should verify against any of the codes
      const isValid1 = await verifyBackupCode("11111111", hashed);
      const isValid2 = await verifyBackupCode("22222222", hashed);
      const isValid3 = await verifyBackupCode("33333333", hashed);

      expect(isValid1).toBe(true);
      expect(isValid2).toBe(true);
      expect(isValid3).toBe(true);
    });

    it("should reject code that doesn't match any hashed code", async () => {
      const codes = ["11111111", "22222222"];
      const hashed = await hashBackupCodes(codes);
      const isValid = await verifyBackupCode("99999999", hashed);

      expect(isValid).toBe(false);
    });

    it("should handle empty hashed codes array", async () => {
      const isValid = await verifyBackupCode("12345678", []);
      expect(isValid).toBe(false);
    });
  });
});
