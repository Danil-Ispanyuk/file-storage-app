/**
 * Integration tests for storage quota functionality
 */

// Mock Prisma Client before imports
jest.mock("@/lib/prismaClient", () => ({
  prismaClient: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    file: {
      aggregate: jest.fn(),
    },
  },
}));

import {
  checkStorageQuota,
  updateUsedStorage,
  getUserStorageStats,
  calculateUserStorage,
} from "@/lib/storageQuota";
import { prismaClient } from "@/lib/prismaClient";

describe("Storage Quota Integration Tests", () => {
  const mockUserId = "user-123";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("checkStorageQuota", () => {
    it("should allow upload when quota is available", async () => {
      (prismaClient.user.findUnique as jest.Mock).mockResolvedValue({
        id: mockUserId,
        storageQuota: 100 * 1024 * 1024, // 100MB
        usedStorage: 50 * 1024 * 1024, // 50MB used
      });

      const result = await checkStorageQuota(mockUserId, 10 * 1024 * 1024); // 10MB file

      expect(result.success).toBe(true);
      expect(result.available).toBe(50 * 1024 * 1024);
    });

    it("should reject upload when quota is exceeded", async () => {
      (prismaClient.user.findUnique as jest.Mock).mockResolvedValue({
        id: mockUserId,
        storageQuota: 100 * 1024 * 1024, // 100MB
        usedStorage: 95 * 1024 * 1024, // 95MB used
      });

      const result = await checkStorageQuota(mockUserId, 10 * 1024 * 1024); // 10MB file

      expect(result.success).toBe(false);
      expect(result.available).toBe(5 * 1024 * 1024);
    });
  });

  describe("updateUsedStorage", () => {
    it("should increment used storage", async () => {
      (prismaClient.user.update as jest.Mock).mockResolvedValue({
        id: mockUserId,
        usedStorage: 1024,
      });

      await updateUsedStorage(mockUserId, 1024);

      expect(prismaClient.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: {
          usedStorage: {
            increment: 1024,
          },
        },
      });
    });

    it("should decrement used storage on delete", async () => {
      await updateUsedStorage(mockUserId, -1024);

      expect(prismaClient.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: {
          usedStorage: {
            increment: -1024,
          },
        },
      });
    });
  });

  describe("getUserStorageStats", () => {
    it("should return correct storage statistics", async () => {
      (prismaClient.user.findUnique as jest.Mock).mockResolvedValue({
        id: mockUserId,
        storageQuota: 100 * 1024 * 1024, // 100MB
        usedStorage: 30 * 1024 * 1024, // 30MB used
      });

      const stats = await getUserStorageStats(mockUserId);

      expect(stats.total).toBe(100 * 1024 * 1024);
      expect(stats.used).toBe(30 * 1024 * 1024);
      expect(stats.free).toBe(70 * 1024 * 1024);
      expect(stats.percentage).toBe(30);
    });
  });

  describe("calculateUserStorage", () => {
    it("should calculate total storage from files", async () => {
      (prismaClient.file.aggregate as jest.Mock).mockResolvedValue({
        _sum: {
          size: 50 * 1024 * 1024, // 50MB
        },
      });

      const total = await calculateUserStorage(mockUserId);

      expect(total).toBe(50 * 1024 * 1024);
    });

    it("should return 0 for user with no files", async () => {
      (prismaClient.file.aggregate as jest.Mock).mockResolvedValue({
        _sum: {
          size: null,
        },
      });

      const total = await calculateUserStorage(mockUserId);

      expect(total).toBe(0);
    });
  });
});
