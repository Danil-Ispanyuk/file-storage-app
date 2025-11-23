import { NextRequest, NextResponse } from "next/server";

import { requireAuthenticatedUser } from "@/lib/authGuard";
import { canViewFile } from "@/lib/fileAccess";
import { logFileEvent } from "@/lib/auditLog";
import { prismaClient } from "@/lib/prismaClient";
import { downloadFile } from "@/lib/fileStorage";
import {
  decryptFile,
  decryptFileKey,
  getMasterKey,
} from "@/lib/fileEncryption";
import { verifyFileHash } from "@/lib/fileHashing";

/**
 * GET /api/files/[id]/view
 * Get file for preview (view-only, no download)
 * This endpoint allows viewing files even with READ permission
 */
export async function GET(
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
      await logFileEvent("FILE_DOWNLOADED", false, request, userId, id, {
        error: "File not found",
        action: "view",
      });

      return NextResponse.json({ message: "File not found." }, { status: 404 });
    }

    // Check if user can view the file
    const hasPermission = await canViewFile(userId, id);
    if (!hasPermission) {
      await logFileEvent("FILE_DOWNLOADED", false, request, userId, id, {
        error: "Permission denied",
        action: "view",
      });

      return NextResponse.json(
        { message: "Permission denied." },
        { status: 403 },
      );
    }

    // Download encrypted file from storage
    const encryptedData = await downloadFile(file.path);

    // Extract IV, auth tag, and encrypted data
    // Format: IV (12 bytes) : authTag (16 bytes) : encrypted data
    const iv = encryptedData.slice(0, 12);
    const authTag = encryptedData.slice(12, 28);
    const encrypted = encryptedData.slice(28);

    // Decrypt file key
    const masterKey = getMasterKey();
    const fileKey = decryptFileKey(file.encryptionKey, masterKey);

    // Decrypt file
    const decryptedBuffer = await decryptFile(encrypted, fileKey, iv, authTag);

    // Verify integrity (hash)
    const isValid = verifyFileHash(decryptedBuffer, file.hash);
    if (!isValid) {
      await logFileEvent("FILE_DOWNLOADED", false, request, userId, id, {
        error: "File integrity check failed",
        action: "view",
      });

      return NextResponse.json(
        { message: "File integrity check failed." },
        { status: 500 },
      );
    }

    // Log successful view
    await logFileEvent("FILE_DOWNLOADED", true, request, userId, id, {
      fileName: file.name,
      size: file.size,
      action: "view",
    });

    // Return file as response with inline disposition (for viewing, not downloading)
    return new NextResponse(new Uint8Array(decryptedBuffer), {
      status: 200,
      headers: {
        "Content-Type": file.mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(file.name)}"`,
        "Content-Length": String(decryptedBuffer.length),
        // Security headers to prevent downloading
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate",
        Pragma: "no-cache",
      },
    });
  } catch (error) {
    console.error("File view error:", error);

    await logFileEvent("FILE_DOWNLOADED", false, request, userId, id, {
      error: error instanceof Error ? error.message : String(error),
      action: "view",
    });

    return NextResponse.json(
      {
        message: "Failed to view file.",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
