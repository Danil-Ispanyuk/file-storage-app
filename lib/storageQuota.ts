import { prismaClient } from "@/lib/prismaClient";

const DEFAULT_STORAGE_QUOTA = 104857600; // 100MB in bytes

/**
 * Calculate total storage used by a user
 * @param userId - User ID
 * @returns Total storage used in bytes
 */
export async function calculateUserStorage(userId: string): Promise<number> {
  const result = await prismaClient.file.aggregate({
    where: { userId },
    _sum: {
      size: true,
    },
  });

  return result._sum.size || 0;
}

/**
 * Check if user has enough storage quota for a file
 * @param userId - User ID
 * @param fileSize - Size of file to upload in bytes
 * @returns Object with success status and details
 */
export async function checkStorageQuota(
  userId: string,
  fileSize: number,
): Promise<{
  success: boolean;
  available: number;
  used: number;
  quota: number;
  required: number;
}> {
  const user = await prismaClient.user.findUnique({
    where: { id: userId },
    select: {
      storageQuota: true,
      usedStorage: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const quota = user.storageQuota || DEFAULT_STORAGE_QUOTA;
  const used = user.usedStorage || 0;
  const available = quota - used;
  const success = available >= fileSize;

  return {
    success,
    available,
    used,
    quota,
    required: fileSize,
  };
}

/**
 * Update user's used storage after file operation
 * @param userId - User ID
 * @param sizeChange - Change in size (positive for upload, negative for delete)
 */
export async function updateUsedStorage(
  userId: string,
  sizeChange: number,
): Promise<void> {
  await prismaClient.user.update({
    where: { id: userId },
    data: {
      usedStorage: {
        increment: sizeChange,
      },
    },
  });
}

/**
 * Recalculate and update user's used storage from actual files
 * Useful for migration or fixing inconsistencies
 * @param userId - User ID
 */
export async function recalculateUserStorage(userId: string): Promise<number> {
  const actualUsed = await calculateUserStorage(userId);

  await prismaClient.user.update({
    where: { id: userId },
    data: {
      usedStorage: actualUsed,
    },
  });

  return actualUsed;
}

/**
 * Get storage statistics for a user
 * @param userId - User ID
 * @returns Storage statistics
 */
export async function getUserStorageStats(userId: string): Promise<{
  total: number;
  used: number;
  free: number;
  percentage: number;
}> {
  const user = await prismaClient.user.findUnique({
    where: { id: userId },
    select: {
      storageQuota: true,
      usedStorage: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const total = user.storageQuota || DEFAULT_STORAGE_QUOTA;
  const used = user.usedStorage || 0;
  const free = total - used;
  const percentage = total > 0 ? (used / total) * 100 : 0;

  return {
    total,
    used,
    free,
    percentage: Math.round(percentage * 100) / 100, // Round to 2 decimal places
  };
}
