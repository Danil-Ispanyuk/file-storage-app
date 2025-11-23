import { NextRequest, NextResponse } from "next/server";

import { requireAuthenticatedUser } from "@/lib/authGuard";
import { canViewFile } from "@/lib/fileAccess";
import { checkSharePermission } from "@/lib/fileSharing";
import { logFileEvent } from "@/lib/auditLog";
import { prismaClient } from "@/lib/prismaClient";
import { downloadFile } from "@/lib/fileStorage";
import {
  decryptFile,
  decryptFileKey,
  getMasterKey,
} from "@/lib/fileEncryption";
import { verifyFileHash } from "@/lib/fileHashing";
import { fileDownloadsTotal } from "@/lib/metrics";

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
      });

      return NextResponse.json({ message: "File not found." }, { status: 404 });
    }

    // Check if user is the owner
    const isOwner = file.userId === userId;

    // If not owner, check if file is shared with user
    let sharePermission: "READ" | "READ_WRITE" | null = null;
    if (!isOwner) {
      sharePermission = await checkSharePermission(userId, id);
      if (!sharePermission) {
        // Check if user can view file (might be shared via other means)
        const hasPermission = await canViewFile(userId, id);
        if (!hasPermission) {
          await logFileEvent("FILE_DOWNLOADED", false, request, userId, id, {
            error: "Permission denied",
          });

          return NextResponse.json(
            { message: "Permission denied." },
            { status: 403 },
          );
        }
      } else {
        // File is shared - check if download is allowed
        // READ permission doesn't allow downloads
        if (sharePermission === "READ") {
          await logFileEvent("FILE_DOWNLOADED", false, request, userId, id, {
            error: "Download not allowed for READ permission",
            permission: sharePermission,
          });

          return NextResponse.json(
            {
              message:
                "Download is not allowed. This file is shared with READ permission only.",
            },
            { status: 403 },
          );
        }
      }
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
      });

      return NextResponse.json(
        { message: "File integrity check failed." },
        { status: 500 },
      );
    }

    // Log successful download
    fileDownloadsTotal.inc({ success: "true" });
    await logFileEvent("FILE_DOWNLOADED", true, request, userId, id, {
      fileName: file.name,
      size: file.size,
    });

    // Return file as response (convert Buffer to Uint8Array for NextResponse)
    return new NextResponse(new Uint8Array(decryptedBuffer), {
      status: 200,
      headers: {
        "Content-Type": file.mimeType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(file.name)}"`,
        "Content-Length": String(decryptedBuffer.length),
      },
    });
  } catch (error) {
    console.error("File download error:", error);

    fileDownloadsTotal.inc({ success: "false" });
    await logFileEvent("FILE_DOWNLOADED", false, request, userId, id, {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        message: "Failed to download file.",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
