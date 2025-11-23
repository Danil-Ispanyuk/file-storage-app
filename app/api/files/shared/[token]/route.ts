import { NextRequest, NextResponse } from "next/server";

import { logFileEvent } from "@/lib/auditLog";
import { prismaClient } from "@/lib/prismaClient";
import { downloadFile } from "@/lib/fileStorage";
import {
  decryptFile,
  decryptFileKey,
  getMasterKey,
} from "@/lib/fileEncryption";
import { verifyFileHash } from "@/lib/fileHashing";
import { validateShareToken } from "@/lib/fileSharing";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const url = new URL(request.url);
  const download = url.searchParams.get("download") === "true"; // Query param to force download

  try {
    // Validate token
    const shareInfo = await validateShareToken(token);
    if (!shareInfo) {
      return NextResponse.json(
        { message: "Invalid or expired share token." },
        { status: 404 },
      );
    }

    // Check permission: READ permission doesn't allow downloads
    if (download && shareInfo.permission === "READ") {
      await logFileEvent(
        "FILE_DOWNLOADED",
        false,
        request,
        shareInfo.sharedBy,
        shareInfo.fileId,
        {
          error: "Download not allowed for READ permission",
          sharedViaToken: true,
          permission: shareInfo.permission,
        },
      );

      return NextResponse.json(
        {
          message:
            "Download is not allowed. This file is shared with READ permission only.",
        },
        { status: 403 },
      );
    }

    // Get file metadata
    const file = await prismaClient.file.findUnique({
      where: { id: shareInfo.fileId },
    });

    if (!file) {
      await logFileEvent(
        "FILE_DOWNLOADED",
        false,
        request,
        shareInfo.sharedBy,
        shareInfo.fileId,
        {
          error: "File not found",
          sharedViaToken: true,
        },
      );

      return NextResponse.json({ message: "File not found." }, { status: 404 });
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
      await logFileEvent(
        "FILE_DOWNLOADED",
        false,
        request,
        shareInfo.sharedBy,
        shareInfo.fileId,
        {
          error: "File integrity check failed",
          sharedViaToken: true,
        },
      );

      return NextResponse.json(
        { message: "File integrity check failed." },
        { status: 500 },
      );
    }

    // Log successful access (view or download)
    const action = download ? "download" : "view";
    await logFileEvent(
      "FILE_DOWNLOADED",
      true,
      request,
      shareInfo.sharedBy,
      shareInfo.fileId,
      {
        fileName: file.name,
        size: file.size,
        sharedViaToken: true,
        action,
        permission: shareInfo.permission,
        token: token.substring(0, 8) + "...", // Log partial token for debugging
      },
    );

    // Return file as response (convert Buffer to Uint8Array for NextResponse)
    // Use "inline" for viewing in browser, "attachment" for forced download
    // READ permission: always inline (download blocked above)
    // READ_WRITE permission: inline by default, attachment if ?download=true
    const disposition = download
      ? `attachment; filename="${encodeURIComponent(file.name)}"`
      : `inline; filename="${encodeURIComponent(file.name)}"`;

    const headers: HeadersInit = {
      "Content-Type": file.mimeType,
      "Content-Disposition": disposition,
      "Content-Length": String(decryptedBuffer.length),
      // Security headers for shared files
      "X-Content-Type-Options": "nosniff",
    };

    // For READ permission, add headers to discourage caching/downloading
    if (shareInfo.permission === "READ" && !download) {
      headers["Cache-Control"] = "no-store, no-cache, must-revalidate";
      headers["Pragma"] = "no-cache";
    }

    return new NextResponse(new Uint8Array(decryptedBuffer), {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Shared file download error:", error);

    return NextResponse.json(
      {
        message: "Failed to download file.",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
