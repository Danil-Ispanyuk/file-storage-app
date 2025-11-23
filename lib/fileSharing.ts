import { prismaClient } from "@/lib/prismaClient";
import { randomBytes } from "crypto";

const TOKEN_LENGTH = 32; // 32 bytes = 64 hex characters

/**
 * Generate unique share token for public links
 * @returns Secure random token
 */
export function generateShareToken(): string {
  return randomBytes(TOKEN_LENGTH).toString("hex");
}

/**
 * Check if a share token is valid and not expired
 * @param token - Share token
 * @returns Share object if valid, null otherwise
 */
export async function validateShareToken(token: string): Promise<{
  fileId: string;
  sharedBy: string;
  permission: "READ" | "READ_WRITE";
} | null> {
  const share = await prismaClient.fileShare.findUnique({
    where: { token },
    select: {
      fileId: true,
      sharedBy: true,
      permission: true,
      expiresAt: true,
    },
  });

  if (!share) {
    return null;
  }

  // Check if expired
  if (share.expiresAt && share.expiresAt < new Date()) {
    return null;
  }

  return {
    fileId: share.fileId,
    sharedBy: share.sharedBy,
    permission: share.permission,
  };
}

/**
 * Check if user has access to file through sharing
 * @param userId - User ID (null for public access via token)
 * @param fileId - File ID
 * @returns Share permission or null if no access
 */
export async function checkSharePermission(
  userId: string | null,
  fileId: string,
): Promise<"READ" | "READ_WRITE" | null> {
  if (!userId) {
    // Public access not supported without token (use validateShareToken instead)
    return null;
  }

  const share = await prismaClient.fileShare.findFirst({
    where: {
      fileId,
      sharedWith: userId,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: {
      permission: true,
    },
  });

  return share ? (share.permission as "READ" | "READ_WRITE") : null;
}

/**
 * Get all active shares for a file
 * @param fileId - File ID
 * @returns Array of shares
 */
export async function getFileShares(fileId: string) {
  return prismaClient.fileShare.findMany({
    where: {
      fileId,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

/**
 * Get all files shared with a user
 * @param userId - User ID
 * @returns Array of files with share information including sharedBy user info
 */
export async function getSharedFiles(userId: string) {
  return prismaClient.fileShare.findMany({
    where: {
      sharedWith: userId,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    include: {
      file: {
        select: {
          id: true,
          name: true,
          size: true,
          mimeType: true,
          createdAt: true,
          userId: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

/**
 * Get user info by ID
 * @param userId - User ID
 * @returns User info or null
 */
export async function getUserInfo(userId: string) {
  return prismaClient.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
    },
  });
}
