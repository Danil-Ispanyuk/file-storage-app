import { prismaClient } from "@/lib/prismaClient";
import { checkSharePermission } from "@/lib/fileSharing";

/**
 * Check if user can view a file
 * @param userId - User ID
 * @param fileId - File ID
 * @returns true if user can view the file
 */
export async function canViewFile(
  userId: string,
  fileId: string,
): Promise<boolean> {
  const file = await prismaClient.file.findUnique({
    where: { id: fileId },
    select: { userId: true },
  });

  if (!file) {
    return false;
  }

  // User can view their own files
  if (file.userId === userId) {
    return true;
  }

  // Check if file is shared with user
  const sharePermission = await checkSharePermission(userId, fileId);
  return sharePermission !== null;
}

/**
 * Check if user can delete a file
 * @param userId - User ID
 * @param fileId - File ID
 * @returns true if user can delete the file
 */
export async function canDeleteFile(
  userId: string,
  fileId: string,
): Promise<boolean> {
  const file = await prismaClient.file.findUnique({
    where: { id: fileId },
    select: { userId: true },
  });

  if (!file) {
    return false;
  }

  // Only owner can delete files (not shared users, even with READ_WRITE)
  return file.userId === userId;
}
