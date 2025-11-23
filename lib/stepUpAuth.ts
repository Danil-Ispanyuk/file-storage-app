import { prismaClient } from "@/lib/prismaClient";

/**
 * Verify step-up token
 * @param userId - User ID
 * @param token - Step-up token
 * @returns true if valid, false otherwise
 */
export async function verifyStepUpToken(
  userId: string,
  token: string,
): Promise<boolean> {
  if (!token) {
    return false;
  }

  const session = await prismaClient.stepUpSession.findUnique({
    where: { token },
  });

  if (!session) {
    return false;
  }

  // Check if session belongs to user
  if (session.userId !== userId) {
    return false;
  }

  // Check if expired
  if (session.expiresAt < new Date()) {
    // Clean up expired session
    await prismaClient.stepUpSession.delete({
      where: { id: session.id },
    });
    return false;
  }

  return true;
}

/**
 * Require step-up authentication for critical operations
 * Checks for step-up token in request header or body
 * @param userId - User ID
 * @param request - NextRequest object
 * @returns true if step-up is valid, false otherwise
 */
export async function requireStepUp(
  userId: string,
  request: Request,
): Promise<{ valid: boolean; error?: string }> {
  // Try to get token from header first
  const headerToken = request.headers.get("X-Step-Up-Token");

  // If not in header, try body (for POST requests)
  let bodyToken: string | null = null;
  if (!headerToken && request.method === "POST") {
    try {
      const body = await request
        .clone()
        .json()
        .catch(() => ({}));
      bodyToken = body.stepUpToken || null;
    } catch {
      // Ignore errors
    }
  }

  const token = headerToken || bodyToken;

  if (!token) {
    return {
      valid: false,
      error:
        "Step-up authentication required. Please provide X-Step-Up-Token header or stepUpToken in body.",
    };
  }

  const isValid = await verifyStepUpToken(userId, token);
  if (!isValid) {
    return {
      valid: false,
      error:
        "Invalid or expired step-up token. Please complete step-up authentication again.",
    };
  }

  return { valid: true };
}
