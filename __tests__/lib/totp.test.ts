import {
  generateTotpSecret,
  generateTotpUrl,
  verifyTotpToken,
  isValidTotpFormat,
} from "@/lib/totp";

describe("totp", () => {
  describe("generateTotpSecret", () => {
    it("should generate a secret", () => {
      const secret = generateTotpSecret();
      expect(secret).toBeDefined();
      expect(typeof secret).toBe("string");
      expect(secret.length).toBeGreaterThan(0);
    });

    it("should generate unique secrets", () => {
      const secret1 = generateTotpSecret();
      const secret2 = generateTotpSecret();
      expect(secret1).not.toBe(secret2);
    });
  });

  describe("generateTotpUrl", () => {
    it("should generate a valid TOTP URL", () => {
      const secret = generateTotpSecret();
      const url = generateTotpUrl(secret, "test@example.com");

      expect(url).toBeDefined();
      expect(url).toContain("otpauth://totp/");
      // URL encoding might change @ to %40
      expect(url).toMatch(/test(@|%40)example\.com/);
      expect(url).toContain("secret=");
    });

    it("should include custom issuer", () => {
      const secret = generateTotpSecret();
      const url = generateTotpUrl(secret, "test@example.com", "Custom App");

      expect(url).toContain("Custom%20App");
    });
  });

  describe("verifyTotpToken", () => {
    it("should verify a valid token", async () => {
      const secret = generateTotpSecret();
      // Generate a token for the current time
      const { authenticator } = await import("otplib");
      const token = authenticator.generate(secret);

      const isValid = verifyTotpToken(token, secret);
      expect(isValid).toBe(true);
    });

    it("should reject an invalid token", () => {
      const secret = generateTotpSecret();
      const invalidToken = "000000";

      const isValid = verifyTotpToken(invalidToken, secret);
      expect(isValid).toBe(false);
    });

    it("should reject token with wrong secret", async () => {
      const secret1 = generateTotpSecret();
      const secret2 = generateTotpSecret();
      const { authenticator } = await import("otplib");
      const token = authenticator.generate(secret1);

      const isValid = verifyTotpToken(token, secret2);
      expect(isValid).toBe(false);
    });

    it("should handle empty token", () => {
      const secret = generateTotpSecret();
      const isValid = verifyTotpToken("", secret);
      expect(isValid).toBe(false);
    });
  });

  describe("isValidTotpFormat", () => {
    it("should accept valid 6-digit tokens", () => {
      expect(isValidTotpFormat("123456")).toBe(true);
      expect(isValidTotpFormat("000000")).toBe(true);
      expect(isValidTotpFormat("999999")).toBe(true);
    });

    it("should reject non-6-digit tokens", () => {
      expect(isValidTotpFormat("12345")).toBe(false); // 5 digits
      expect(isValidTotpFormat("1234567")).toBe(false); // 7 digits
      expect(isValidTotpFormat("12345a")).toBe(false); // contains letter
      expect(isValidTotpFormat("")).toBe(false); // empty
    });

    it("should reject tokens with non-numeric characters", () => {
      expect(isValidTotpFormat("12345a")).toBe(false);
      expect(isValidTotpFormat("abcdef")).toBe(false);
      expect(isValidTotpFormat("12-456")).toBe(false);
    });
  });
});
