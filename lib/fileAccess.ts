import { prismaClient } from "@/lib/prismaClient";

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
  return file.userId === userId;
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
  // For MVP, same as view permission
  return canViewFile(userId, fileId);
}
