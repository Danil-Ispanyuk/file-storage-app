import { NextResponse } from "next/server";
import type { UserRole } from "@/types/nextAuth";

import { auth } from "@/lib/auth";

const UNAUTHORIZED_RESPONSE = NextResponse.json(
  { message: "Unauthorized" },
  { status: 401 },
);

const FORBIDDEN_RESPONSE = NextResponse.json(
  { message: "Forbidden" },
  { status: 403 },
);

/**
 * Require user to be authenticated
 * @returns { session, response } - session if authenticated, or error response
 */
export async function requireAuthenticatedUser() {
  const session = await auth();

  if (!session?.user) {
    return { session: null, response: UNAUTHORIZED_RESPONSE };
  }

  return { session, response: null };
}

/**
 * Require user to have a specific role
 * @param requiredRole - The role required to access the resource
 * @returns { session, response } - session if authorized, or error response
 */
export async function requireRole(requiredRole: UserRole) {
  const session = await auth();

  if (!session?.user) {
    return { session: null, response: UNAUTHORIZED_RESPONSE };
  }

  if (session.user.role !== requiredRole) {
    return { session: null, response: FORBIDDEN_RESPONSE };
  }

  return { session, response: null };
}

/**
 * Require user to be an ADMIN
 * @returns { session, response } - session if admin, or error response
 */
export async function requireAdmin() {
  return requireRole("ADMIN");
}

/**
 * Require user to be a MANAGER or ADMIN
 * Managers have elevated permissions but not full admin access
 * @returns { session, response } - session if manager/admin, or error response
 */
export async function requireManager() {
  const session = await auth();

  if (!session?.user) {
    return { session: null, response: UNAUTHORIZED_RESPONSE };
  }

  if (session.user.role !== "MANAGER" && session.user.role !== "ADMIN") {
    return { session: null, response: FORBIDDEN_RESPONSE };
  }

  return { session, response: null };
}

/**
 * Require user to have one of the specified roles
 * @param allowedRoles - Array of roles that can access the resource
 * @returns { session, response } - session if authorized, or error response
 */
export async function requireAnyRole(...allowedRoles: UserRole[]) {
  const session = await auth();

  if (!session?.user) {
    return { session: null, response: UNAUTHORIZED_RESPONSE };
  }

  if (!allowedRoles.includes(session.user.role)) {
    return { session: null, response: FORBIDDEN_RESPONSE };
  }

  return { session, response: null };
}
