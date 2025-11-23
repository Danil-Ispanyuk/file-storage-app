/**
 * Integration tests for file sharing functionality
 */

// Mock Prisma Client before imports
jest.mock("@/lib/prismaClient", () => ({
  prismaClient: {
    fileShare: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

import {
  generateShareToken,
  validateShareToken,
  checkSharePermission,
  getFileShares,
  getSharedFiles,
} from "@/lib/fileSharing";
import { prismaClient } from "@/lib/prismaClient";

describe("File Sharing Integration Tests", () => {
  const mockUserId = "user-123";
  const mockFileId = "file-456";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("generateShareToken", () => {
    it("should generate unique tokens", () => {
      const token1 = generateShareToken();
      const token2 = generateShareToken();

      expect(token1).toBeDefined();
      expect(token2).toBeDefined();
      expect(token1).not.toBe(token2);
      expect(token1.length).toBe(64); // 32 bytes = 64 hex chars
    });
  });

  describe("validateShareToken", () => {
    it("should validate active share token", async () => {
      const token = generateShareToken();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7); // 7 days from now

      (prismaClient.fileShare.findUnique as jest.Mock).mockResolvedValue({
        fileId: mockFileId,
        sharedBy: mockUserId,
        permission: "READ",
        expiresAt: futureDate,
      });

      const result = await validateShareToken(token);

      expect(result).not.toBeNull();
      expect(result?.fileId).toBe(mockFileId);
      expect(result?.permission).toBe("READ");
    });

    it("should reject expired token", async () => {
      const token = generateShareToken();
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1); // 1 day ago

      (prismaClient.fileShare.findUnique as jest.Mock).mockResolvedValue({
        fileId: mockFileId,
        sharedBy: mockUserId,
        permission: "READ",
        expiresAt: pastDate,
      });

      const result = await validateShareToken(token);

      expect(result).toBeNull();
    });

    it("should reject non-existent token", async () => {
      (prismaClient.fileShare.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await validateShareToken("invalid-token");

      expect(result).toBeNull();
    });
  });

  describe("checkSharePermission", () => {
    it("should grant access for shared user", async () => {
      (prismaClient.fileShare.findFirst as jest.Mock).mockResolvedValue({
        permission: "READ",
      });

      const permission = await checkSharePermission(mockUserId, mockFileId);

      expect(permission).toBe("READ");
    });

    it("should return null for non-shared file", async () => {
      (prismaClient.fileShare.findFirst as jest.Mock).mockResolvedValue(null);

      const permission = await checkSharePermission(mockUserId, mockFileId);

      expect(permission).toBeNull();
    });
  });

  describe("getFileShares", () => {
    it("should return all shares for a file", async () => {
      const mockShares = [
        {
          id: "share-1",
          fileId: mockFileId,
          sharedBy: mockUserId,
          sharedWith: "user-456",
          permission: "READ",
          createdAt: new Date(),
        },
        {
          id: "share-2",
          fileId: mockFileId,
          sharedBy: mockUserId,
          sharedWith: null, // Public
          permission: "READ_WRITE",
          createdAt: new Date(),
        },
      ];

      (prismaClient.fileShare.findMany as jest.Mock).mockResolvedValue(
        mockShares,
      );

      const shares = await getFileShares(mockFileId);

      expect(shares).toHaveLength(2);
      expect(shares[0].id).toBe("share-1");
      expect(shares[1].sharedWith).toBeNull(); // Public share
    });
  });

  describe("getSharedFiles", () => {
    it("should return files shared with user", async () => {
      const mockShares = [
        {
          id: "share-1",
          fileId: mockFileId,
          sharedBy: "user-owner",
          sharedWith: mockUserId,
          permission: "READ",
          createdAt: new Date(),
          file: {
            id: mockFileId,
            name: "shared-file.pdf",
            size: 1024,
            mimeType: "application/pdf",
            createdAt: new Date(),
            userId: "user-owner",
          },
        },
      ];

      (prismaClient.fileShare.findMany as jest.Mock).mockResolvedValue(
        mockShares,
      );

      const sharedFiles = await getSharedFiles(mockUserId);

      expect(sharedFiles).toHaveLength(1);
      expect(sharedFiles[0].file.name).toBe("shared-file.pdf");
    });
  });
});
