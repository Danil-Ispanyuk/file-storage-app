import { AuditAction } from "@prisma/client";
import { prismaClient } from "@/lib/prismaClient";
import { getClientIP } from "@/lib/rateLimit";

export interface AuditLogMetadata {
  [key: string]: unknown;
  error?: string;
  email?: string;
  reason?: string;
  details?: string;
}

/**
 * Log an audit event
 * @param action - Type of action being logged
 * @param success - Whether the action succeeded
 * @param request - Request object to extract IP and user agent
 * @param userId - Optional user ID (null for system events)
 * @param metadata - Additional metadata to store as JSON
 */
export async function logAuditEvent(
  action: AuditAction,
  success: boolean,
  request: Request,
  userId?: string | null,
  metadata?: AuditLogMetadata,
): Promise<void> {
  try {
    const ipAddress = getClientIP(request);
    const userAgent = request.headers.get("user-agent") ?? null;

    const metadataJson = metadata ? JSON.stringify(metadata) : null;

    await prismaClient.auditLog.create({
      data: {
        userId: userId ?? null,
        action,
        success,
        ipAddress,
        userAgent,
        metadata: metadataJson,
      },
    });
  } catch (error) {
    // Don't throw - audit logging should never break the main flow
    // Log to console as fallback
    console.error("Failed to log audit event:", {
      action,
      success,
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Log authentication events
 */
export async function logAuthEvent(
  action: "LOGIN_SUCCESS" | "LOGIN_FAILED" | "LOGOUT" | "REGISTER",
  success: boolean,
  request: Request,
  userId?: string | null,
  metadata?: AuditLogMetadata,
): Promise<void> {
  await logAuditEvent(action, success, request, userId, metadata);
}

/**
 * Log 2FA events
 */
export async function log2FAEvent(
  action:
    | "TWO_FACTOR_SETUP"
    | "TWO_FACTOR_VERIFY_SUCCESS"
    | "TWO_FACTOR_VERIFY_FAILED"
    | "TWO_FACTOR_DISABLED"
    | "BACKUP_CODE_USED",
  success: boolean,
  request: Request,
  userId?: string | null,
  metadata?: AuditLogMetadata,
): Promise<void> {
  await logAuditEvent(action, success, request, userId, metadata);
}

/**
 * Log rate limit exceeded event
 */
export async function logRateLimitExceeded(
  request: Request,
  endpoint: string,
  ipAddress: string,
): Promise<void> {
  await logAuditEvent("RATE_LIMIT_EXCEEDED", false, request, null, {
    endpoint,
    ipAddress,
  });
}

/**
 * Get audit logs for a user
 */
export async function getUserAuditLogs(
  userId: string,
  limit: number = 100,
  offset: number = 0,
) {
  return prismaClient.auditLog.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });
}

/**
 * Get audit logs by action
 */
export async function getAuditLogsByAction(
  action: AuditAction,
  limit: number = 100,
  offset: number = 0,
) {
  return prismaClient.auditLog.findMany({
    where: { action },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });
}

/**
 * Log file operations
 */
export async function logFileEvent(
  action: "FILE_UPLOADED" | "FILE_DOWNLOADED" | "FILE_DELETED" | "FILE_SHARED",
  success: boolean,
  request: Request,
  userId: string | null,
  fileId: string,
  metadata?: AuditLogMetadata,
): Promise<void> {
  await logAuditEvent(action, success, request, userId, {
    ...metadata,
    fileId,
  });
}
