import { NextRequest, NextResponse } from "next/server";

import { requireAuthenticatedUser } from "@/lib/authGuard";
import { logFileEvent } from "@/lib/auditLog";
import { prismaClient } from "@/lib/prismaClient";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; shareId: string }> },
) {
  const { session, response } = await requireAuthenticatedUser();
  if (response) {
    return response;
  }

  const userId = session.user.id;
  const { id: fileId, shareId } = await params;

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
        error: "Permission denied - only owner can revoke shares",
        shareId,
      });

      return NextResponse.json(
        { message: "Permission denied. Only file owner can revoke shares." },
        { status: 403 },
      );
    }

    // Get share
    const share = await prismaClient.fileShare.findUnique({
      where: { id: shareId },
    });

    if (!share) {
      return NextResponse.json(
        { message: "Share not found." },
        { status: 404 },
      );
    }

    // Verify share belongs to this file
    if (share.fileId !== fileId) {
      return NextResponse.json(
        { message: "Share does not belong to this file." },
        { status: 400 },
      );
    }

    // Delete share
    await prismaClient.fileShare.delete({
      where: { id: shareId },
    });

    // Log successful revocation
    await logFileEvent("FILE_SHARED", true, request, userId, fileId, {
      shareId,
      sharedWith: share.sharedWith || "public",
    });

    return NextResponse.json(
      {
        message: "Share revoked successfully.",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Share revocation error:", error);

    await logFileEvent("FILE_SHARED", false, request, userId, fileId, {
      error: error instanceof Error ? error.message : String(error),
      shareId,
    });

    return NextResponse.json(
      {
        message: "Failed to revoke share.",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
