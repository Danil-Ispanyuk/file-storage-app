import { NextRequest, NextResponse } from "next/server";

import { requireAuthenticatedUser } from "@/lib/authGuard";
import { logFileEvent } from "@/lib/auditLog";
import { prismaClient } from "@/lib/prismaClient";
import { generateShareToken } from "@/lib/fileSharing";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, response } = await requireAuthenticatedUser();
  if (response) {
    return response;
  }

  const userId = session.user.id;
  const { id: fileId } = await params;

  try {
    // Get file metadata
    const file = await prismaClient.file.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      return NextResponse.json({ message: "File not found." }, { status: 404 });
    }

    // Check if user is the owner
    if (file.userId !== userId) {
      await logFileEvent("FILE_SHARED", false, request, userId, fileId, {
        error: "Permission denied - only owner can share",
      });

      return NextResponse.json(
        { message: "Permission denied. Only file owner can share." },
        { status: 403 },
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      sharedWith,
      permission = "READ",
      expiresAt,
      public: isPublic = false,
      stepUpToken,
    } = body;

    // Validate permission
    if (permission !== "READ" && permission !== "READ_WRITE") {
      return NextResponse.json(
        { message: "Invalid permission. Must be READ or READ_WRITE." },
        { status: 400 },
      );
    }

    // Require step-up authentication for public shares (critical operation)
    if (isPublic) {
      // Check for step-up token in header or body
      const headerToken = request.headers.get("X-Step-Up-Token");
      const token = headerToken || stepUpToken;

      if (!token) {
        await logFileEvent("FILE_SHARED", false, request, userId, fileId, {
          error: "Step-up authentication required for public sharing",
        });

        return NextResponse.json(
          {
            message:
              "Step-up authentication required for public sharing. Please provide X-Step-Up-Token header or stepUpToken in body.",
            stepUpRequired: true,
          },
          { status: 403 },
        );
      }

      // Verify step-up token
      const { verifyStepUpToken } = await import("@/lib/stepUpAuth");
      const isValid = await verifyStepUpToken(userId, token);

      if (!isValid) {
        await logFileEvent("FILE_SHARED", false, request, userId, fileId, {
          error: "Invalid or expired step-up token",
        });

        return NextResponse.json(
          {
            message:
              "Invalid or expired step-up token. Please complete step-up authentication again.",
            stepUpRequired: true,
          },
          { status: 403 },
        );
      }
    }

    // Validate: public share doesn't need sharedWith, private share needs sharedWith
    if (isPublic && sharedWith) {
      return NextResponse.json(
        {
          message:
            "Public share cannot have sharedWith. Use public: true without sharedWith.",
        },
        { status: 400 },
      );
    }

    if (!isPublic && !sharedWith) {
      return NextResponse.json(
        {
          message:
            "Private share requires sharedWith. Provide userId or set public: true.",
        },
        { status: 400 },
      );
    }

    // Validate sharedWith user exists (if private share)
    // Support both userId and email
    let targetUserId: string | null = null;
    if (!isPublic && sharedWith) {
      // Try to find by ID first
      let targetUser = await prismaClient.user.findUnique({
        where: { id: sharedWith },
      });

      // If not found by ID, try to find by email
      if (!targetUser) {
        targetUser = await prismaClient.user.findUnique({
          where: { email: sharedWith.trim() },
        });
      }

      if (!targetUser) {
        return NextResponse.json(
          {
            message:
              "Target user not found. Please provide a valid user ID or email.",
          },
          { status: 404 },
        );
      }

      // Don't allow sharing with yourself
      if (targetUser.id === userId) {
        return NextResponse.json(
          { message: "You cannot share a file with yourself." },
          { status: 400 },
        );
      }

      targetUserId = targetUser.id;
    }

    // Generate token for public shares
    const token = isPublic ? generateShareToken() : null;

    // Parse expiresAt if provided
    let expiresAtDate: Date | null = null;
    if (expiresAt) {
      expiresAtDate = new Date(expiresAt);
      if (isNaN(expiresAtDate.getTime())) {
        return NextResponse.json(
          { message: "Invalid expiresAt date format." },
          { status: 400 },
        );
      }
    }

    // Check if share already exists for this user (if private)
    if (!isPublic && targetUserId) {
      const existingShare = await prismaClient.fileShare.findFirst({
        where: {
          fileId,
          sharedWith: targetUserId,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
      });

      if (existingShare) {
        // Update existing share
        const share = await prismaClient.fileShare.update({
          where: { id: existingShare.id },
          data: {
            permission: permission as "READ" | "READ_WRITE",
            expiresAt: expiresAtDate,
          },
        });

        await logFileEvent("FILE_SHARED", true, request, userId, fileId, {
          shareId: share.id,
          sharedWith: share.sharedWith || "public",
          permission: share.permission,
          isPublic: false,
          action: "updated",
        });

        return NextResponse.json(
          {
            message: "File share updated successfully.",
            share: {
              id: share.id,
              permission: share.permission,
              expiresAt: share.expiresAt,
            },
          },
          { status: 200 },
        );
      }
    }

    // Create new share
    const share = await prismaClient.fileShare.create({
      data: {
        fileId,
        sharedBy: userId,
        sharedWith: isPublic ? null : targetUserId,
        permission: permission as "READ" | "READ_WRITE",
        token,
        expiresAt: expiresAtDate,
      },
    });

    // Log successful share
    await logFileEvent("FILE_SHARED", true, request, userId, fileId, {
      shareId: share.id,
      sharedWith: share.sharedWith || "public",
      permission: share.permission,
      isPublic,
    });

    return NextResponse.json(
      {
        message: "File shared successfully.",
        share: {
          id: share.id,
          token: share.token,
          permission: share.permission,
          expiresAt: share.expiresAt,
          publicUrl: isPublic
            ? `${request.nextUrl.origin}/shared/view/${share.token}`
            : null,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("File share error:", error);

    await logFileEvent("FILE_SHARED", false, request, userId, fileId, {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        message: "Failed to share file.",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
