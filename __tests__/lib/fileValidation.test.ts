import {
  validateFile,
  validateFileSize,
  validateMimeType,
  validateFileName,
} from "@/lib/fileValidation";

describe("fileValidation", () => {
  describe("validateFileSize", () => {
    it("should accept files within size limit", () => {
      const result = validateFileSize(50 * 1024 * 1024); // 50MB
      expect(result.valid).toBe(true);
    });

    it("should reject files exceeding size limit", () => {
      const result = validateFileSize(101 * 1024 * 1024); // 101MB
      expect(result.valid).toBe(false);
      expect(result.error).toContain("exceeds maximum");
    });

    it("should accept files at exact size limit", () => {
      const result = validateFileSize(100 * 1024 * 1024); // Exactly 100MB
      expect(result.valid).toBe(true);
    });

    it("should accept small files", () => {
      const result = validateFileSize(1024); // 1KB
      expect(result.valid).toBe(true);
    });
  });

  describe("validateMimeType", () => {
    it("should accept allowed image types", () => {
      const result = validateMimeType("image/jpeg");
      expect(result.valid).toBe(true);
    });

    it("should accept allowed document types", () => {
      const result = validateMimeType("application/pdf");
      expect(result.valid).toBe(true);
    });

    it("should accept text files", () => {
      const result = validateMimeType("text/plain");
      expect(result.valid).toBe(true);
    });

    it("should reject disallowed types", () => {
      const result = validateMimeType("application/x-executable");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("not allowed");
    });

    it("should accept DOCX format", () => {
      const result = validateMimeType(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      );
      expect(result.valid).toBe(true);
    });
  });

  describe("validateFileName", () => {
    it("should accept valid file names", () => {
      const result = validateFileName("test-file.pdf");
      expect(result.valid).toBe(true);
    });

    it("should reject empty file names", () => {
      const result = validateFileName("");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("cannot be empty");
    });

    it("should reject file names with path traversal", () => {
      const result1 = validateFileName("../file.pdf");
      expect(result1.valid).toBe(false);

      const result2 = validateFileName("../../file.pdf");
      expect(result2.valid).toBe(false);
    });

    it("should reject file names with slashes", () => {
      const result1 = validateFileName("path/to/file.pdf");
      expect(result1.valid).toBe(false);

      const result2 = validateFileName("path\\to\\file.pdf");
      expect(result2.valid).toBe(false);
    });

    it("should reject file names that are too long", () => {
      const longName = "a".repeat(256);
      const result = validateFileName(longName);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("too long");
    });

    it("should accept file names at max length", () => {
      const maxName = "a".repeat(255);
      const result = validateFileName(maxName);
      expect(result.valid).toBe(true);
    });
  });

  describe("validateFile", () => {
    it("should accept valid files", () => {
      const result = validateFile(
        1024 * 1024, // 1MB
        "image/jpeg",
        "test.jpg",
      );
      expect(result.valid).toBe(true);
    });

    it("should reject files with invalid size", () => {
      const result = validateFile(
        101 * 1024 * 1024, // 101MB
        "image/jpeg",
        "test.jpg",
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain("exceeds maximum");
    });

    it("should reject files with invalid MIME type", () => {
      const result = validateFile(
        1024 * 1024,
        "application/x-executable",
        "test.exe",
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain("not allowed");
    });

    it("should reject files with invalid name", () => {
      const result = validateFile(1024 * 1024, "image/jpeg", "../test.jpg");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid file name");
    });

    it("should validate all aspects", () => {
      const result = validateFile(
        50 * 1024 * 1024, // 50MB
        "application/pdf",
        "document.pdf",
      );
      expect(result.valid).toBe(true);
    });
  });
});
