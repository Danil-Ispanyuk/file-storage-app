import { NextRequest, NextResponse } from "next/server";

import { requireAuthenticatedUser } from "@/lib/authGuard";
import { logFileEvent } from "@/lib/auditLog";
import { prismaClient } from "@/lib/prismaClient";

/**
 * DELETE /api/files/shared/[shareId]
 * Remove a shared file from user's list (revoke access from recipient side)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ shareId: string }> },
) {
  const { session, response } = await requireAuthenticatedUser();
  if (response) {
    return response;
  }

  const userId = session.user.id;
  const { shareId } = await params;

  try {
    // Get the share
    const share = await prismaClient.fileShare.findUnique({
      where: { id: shareId },
      include: {
        file: {
          select: {
            id: true,
            name: true,
            userId: true,
          },
        },
      },
    });

    if (!share) {
      return NextResponse.json(
        { message: "Share not found." },
        { status: 404 },
      );
    }

    // Check if user is the recipient (sharedWith)
    if (share.sharedWith !== userId) {
      await logFileEvent(
        "FILE_SHARE_REVOKED",
        false,
        request,
        userId,
        share.fileId,
        {
          error: "Permission denied - only recipient can remove shared file",
          shareId,
        },
      );

      return NextResponse.json(
        {
          message:
            "Permission denied. Only the recipient can remove a shared file.",
        },
        { status: 403 },
      );
    }

    // Delete the share
    await prismaClient.fileShare.delete({
      where: { id: shareId },
    });

    // Log the event (from recipient's perspective)
    await logFileEvent(
      "FILE_SHARE_REVOKED",
      true,
      request,
      userId,
      share.fileId,
      {
        shareId,
        action: "removed_by_recipient",
        sharedBy: share.sharedBy,
      },
    );

    // Also log from owner's perspective (if different user)
    if (share.sharedBy !== userId) {
      await logFileEvent(
        "FILE_SHARE_REVOKED",
        true,
        request,
        share.sharedBy,
        share.fileId,
        {
          shareId,
          action: "removed_by_recipient",
          sharedWith: userId,
        },
      );
    }

    return NextResponse.json(
      { message: "Shared file removed successfully." },
      { status: 200 },
    );
  } catch (error) {
    console.error("Remove shared file error:", error);

    await logFileEvent("FILE_SHARE_REVOKED", false, request, userId, "", {
      error: error instanceof Error ? error.message : String(error),
      shareId,
    });

    return NextResponse.json(
      {
        message: "Failed to remove shared file.",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
