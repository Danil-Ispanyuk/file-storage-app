import { NextRequest, NextResponse } from "next/server";

import { requireAuthenticatedUser } from "@/lib/authGuard";
import { canDeleteFile } from "@/lib/fileAccess";
import { logFileEvent } from "@/lib/auditLog";
import { prismaClient } from "@/lib/prismaClient";
import { deleteFile as deleteFileFromStorage } from "@/lib/fileStorage";
import { updateUsedStorage } from "@/lib/storageQuota";
import { requireStepUp } from "@/lib/stepUpAuth";
import { fileDeletesTotal } from "@/lib/metrics";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, response } = await requireAuthenticatedUser();
  if (response) {
    return response;
  }

  const userId = session.user.id;
  const { id } = await params;

  try {
    // Get file metadata
    const file = await prismaClient.file.findUnique({
      where: { id },
    });

    if (!file) {
      await logFileEvent("FILE_DELETED", false, request, userId, id, {
        error: "File not found",
      });

      return NextResponse.json({ message: "File not found." }, { status: 404 });
    }

    // Check permissions
    const hasPermission = await canDeleteFile(userId, id);
    if (!hasPermission) {
      await logFileEvent("FILE_DELETED", false, request, userId, id, {
        error: "Permission denied",
      });

      return NextResponse.json(
        { message: "Permission denied." },
        { status: 403 },
      );
    }

    // Require step-up authentication for file deletion
    const stepUpCheck = await requireStepUp(userId, request);
    if (!stepUpCheck.valid) {
      await logFileEvent("FILE_DELETED", false, request, userId, id, {
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

    // Delete file from storage
    await deleteFileFromStorage(file.path);

    // Delete metadata from database
    await prismaClient.file.delete({
      where: { id },
    });

    // Update user's used storage (decrease by file size)
    await updateUsedStorage(userId, -file.size);

    // Record metrics
    fileDeletesTotal.inc({ success: "true" });

    // Log successful deletion
    await logFileEvent("FILE_DELETED", true, request, userId, id, {
      fileName: file.name,
    });

    return NextResponse.json(
      {
        message: "File deleted successfully.",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("File deletion error:", error);

    // Record failed delete metric
    fileDeletesTotal.inc({ success: "false" });

    await logFileEvent("FILE_DELETED", false, request, userId, id, {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        message: "Failed to delete file.",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
