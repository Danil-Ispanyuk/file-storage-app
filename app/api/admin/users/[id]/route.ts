import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/authGuard";
import { requireStepUp } from "@/lib/stepUpAuth";
import { logAuditEvent } from "@/lib/auditLog";
import { prismaClient } from "@/lib/prismaClient";
import { Role } from "@prisma/client";

/**
 * PUT /api/admin/users/:id/role
 * Update user role (admin only, requires step-up auth)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, response } = await requireAdmin();
  if (response) {
    return response;
  }

  const adminId = session!.user.id;
  const { id } = await params;

  // Require step-up authentication for role changes
  const stepUpCheck = await requireStepUp(adminId, request);
  if (!stepUpCheck.valid) {
    await logAuditEvent("ROLE_CHANGED", false, request, adminId, {
      targetUserId: id,
      error: "Step-up authentication required",
    });

    return NextResponse.json(
      {
        message: stepUpCheck.error || "Step-up authentication required.",
        stepUpRequired: true,
      },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();
    const { role } = body;

    // Validate role
    if (!role || !Object.values(Role).includes(role)) {
      return NextResponse.json({ message: "Invalid role." }, { status: 400 });
    }

    // Get current user
    const user = await prismaClient.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ message: "User not found." }, { status: 404 });
    }

    // Prevent changing own role
    if (id === adminId) {
      return NextResponse.json(
        { message: "Cannot change your own role." },
        { status: 400 },
      );
    }

    // Update role
    const updatedUser = await prismaClient.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        updatedAt: true,
      },
    });

    // Log audit event
    await logAuditEvent("ROLE_CHANGED", true, request, adminId, {
      targetUserId: id,
      targetUserEmail: user.email,
      oldRole: user.role,
      newRole: role,
    });

    return NextResponse.json({
      message: "User role updated successfully.",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating user role:", error);
    await logAuditEvent("ROLE_CHANGED", false, request, adminId, {
      targetUserId: id,
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        message: "Failed to update user role.",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/users/:id
 * Delete user (admin only, requires step-up auth)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, response } = await requireAdmin();
  if (response) {
    return response;
  }

  const adminId = session!.user.id;
  const { id } = await params;

  // Require step-up authentication for user deletion
  const stepUpCheck = await requireStepUp(adminId, request);
  if (!stepUpCheck.valid) {
    return NextResponse.json(
      {
        message: stepUpCheck.error || "Step-up authentication required.",
        stepUpRequired: true,
      },
      { status: 403 },
    );
  }

  try {
    // Prevent deleting own account
    if (id === adminId) {
      return NextResponse.json(
        { message: "Cannot delete your own account." },
        { status: 400 },
      );
    }

    // Get user before deletion
    const user = await prismaClient.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ message: "User not found." }, { status: 404 });
    }

    // Delete user (cascade will delete related records)
    await prismaClient.user.delete({
      where: { id },
    });

    // Log audit event
    await logAuditEvent("USER_DELETED", true, request, adminId, {
      deletedUserId: id,
      deletedUserEmail: user.email,
      deletedUserRole: user.role,
    });

    return NextResponse.json({
      message: "User deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    await logAuditEvent("USER_DELETED", false, request, adminId, {
      targetUserId: id,
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        message: "Failed to delete user.",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
