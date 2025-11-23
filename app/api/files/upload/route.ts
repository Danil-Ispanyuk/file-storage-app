import { NextRequest, NextResponse } from "next/server";

import { requireAuthenticatedUser } from "@/lib/authGuard";
import { logFileEvent, logRateLimitExceeded } from "@/lib/auditLog";
import { checkRateLimit, fileUploadRateLimit } from "@/lib/rateLimit";
import { prismaClient } from "@/lib/prismaClient";
import { uploadFile } from "@/lib/fileStorage";
import {
  generateFileKey,
  encryptFile,
  encryptFileKey,
  getMasterKey,
} from "@/lib/fileEncryption";
import { calculateFileHash } from "@/lib/fileHashing";
import { validateFile } from "@/lib/fileValidation";
import { checkStorageQuota, updateUsedStorage } from "@/lib/storageQuota";
import { compressFile, isCompressible } from "@/lib/fileCompression";
import { fileUploadsTotal, fileUploadSize } from "@/lib/metrics";

export async function POST(request: NextRequest) {
  const { session, response } = await requireAuthenticatedUser();
  if (response) {
    return response;
  }

  const userId = session.user.id;

  // Rate limiting: max 10 uploads per 15 minutes per user
  const rateLimitResult = await checkRateLimit(fileUploadRateLimit, userId);

  if (!rateLimitResult.success) {
    await logRateLimitExceeded(request, "/api/files/upload", userId);

    return NextResponse.json(
      {
        message: "Too many file uploads. Please try again later.",
        rateLimitExceeded: true,
        reset: rateLimitResult.reset,
      },
      {
        status: 429,
        headers: {
          "Retry-After": rateLimitResult.reset
            ? String(Math.ceil((rateLimitResult.reset - Date.now()) / 1000))
            : "900",
          "X-RateLimit-Limit": String(rateLimitResult.limit ?? 10),
          "X-RateLimit-Remaining": String(rateLimitResult.remaining ?? 0),
          "X-RateLimit-Reset": String(
            rateLimitResult.reset ?? Date.now() + 900000,
          ),
        },
      },
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const compress = formData.get("compress") === "true";

    if (!file) {
      await logFileEvent("FILE_UPLOADED", false, request, userId, "", {
        error: "No file provided",
      });

      return NextResponse.json(
        { message: "No file provided." },
        { status: 400 },
      );
    }

    // Convert File to Buffer
    const bytes = await file.arrayBuffer();
    let buffer: Buffer = Buffer.from(bytes);
    let mimeType = file.type;
    let compressionStats: {
      originalSize: number;
      compressedSize: number;
      ratio: number;
      wasAlreadyCompressed?: boolean;
    } | null = null;

    // Compress file if requested and format is supported
    if (compress && isCompressible(file.type)) {
      const compressionResult = await compressFile(buffer, file.type);
      buffer = compressionResult.buffer;
      mimeType = compressionResult.mimeType;
      compressionStats = {
        originalSize: compressionResult.originalSize,
        compressedSize: compressionResult.compressedSize,
        ratio: compressionResult.ratio,
        wasAlreadyCompressed: compressionResult.wasAlreadyCompressed ?? false,
      };
    }

    // Validate file (use compressed size if compressed)
    const validation = validateFile(buffer.length, mimeType, file.name);
    if (!validation.valid) {
      await logFileEvent("FILE_UPLOADED", false, request, userId, "", {
        error: validation.error,
      });

      return NextResponse.json({ message: validation.error }, { status: 400 });
    }

    // Check storage quota (use compressed size if compressed)
    const quotaCheck = await checkStorageQuota(userId, buffer.length);
    if (!quotaCheck.success) {
      await logFileEvent("FILE_UPLOADED", false, request, userId, "", {
        error: "Storage quota exceeded",
        available: quotaCheck.available,
        required: quotaCheck.required,
      });

      return NextResponse.json(
        {
          message: `Storage quota exceeded. Available: ${formatBytes(quotaCheck.available)}, Required: ${formatBytes(quotaCheck.required)}`,
          quotaExceeded: true,
          available: quotaCheck.available,
          required: quotaCheck.required,
        },
        { status: 413 },
      );
    }

    // Calculate file hash (before encryption)
    const hash = calculateFileHash(buffer);

    // Generate encryption key for this file
    const fileKey = generateFileKey();

    // Encrypt file
    const { encrypted, iv, authTag } = await encryptFile(buffer, fileKey);

    // Combine encrypted data with IV and auth tag
    // Format: IV (12 bytes) + authTag (16 bytes) + encrypted data
    const encryptedData = Buffer.concat([
      iv, // 12 bytes
      authTag, // 16 bytes
      encrypted, // variable length
    ]);

    // Encrypt the file key with master key
    const masterKey = getMasterKey();
    const encryptedFileKey = encryptFileKey(fileKey, masterKey);

    // Upload encrypted file to storage
    const storagePath = await uploadFile(encryptedData, file.name);

    // Save metadata to database
    const savedFile = await prismaClient.file.create({
      data: {
        userId,
        name: file.name,
        path: storagePath,
        size: buffer.length, // Size after compression (if compressed)
        mimeType: mimeType, // MIME type after compression (if compressed)
        hash,
        encrypted: true,
        encryptionKey: encryptedFileKey,
      },
    });

    // Update user's used storage (use compressed size)
    await updateUsedStorage(userId, buffer.length);

    // Record metrics
    fileUploadsTotal.inc({ success: "true" });
    fileUploadSize.observe(buffer.length);

    // Log successful upload
    await logFileEvent("FILE_UPLOADED", true, request, userId, savedFile.id, {
      fileName: file.name,
      size: buffer.length,
      originalSize: compressionStats?.originalSize,
      mimeType: mimeType,
      compressed: compress && compressionStats !== null,
      compressionRatio: compressionStats?.ratio,
      wasAlreadyCompressed: compressionStats?.wasAlreadyCompressed ?? false,
    });

    return NextResponse.json(
      {
        message: "File uploaded successfully.",
        file: {
          id: savedFile.id,
          name: savedFile.name,
          size: savedFile.size,
          mimeType: savedFile.mimeType,
          createdAt: savedFile.createdAt,
        },
        compression: compressionStats
          ? {
              originalSize: compressionStats.originalSize,
              compressedSize: compressionStats.compressedSize,
              ratio: compressionStats.ratio,
              saved:
                compressionStats.originalSize - compressionStats.compressedSize,
              wasAlreadyCompressed:
                compressionStats.wasAlreadyCompressed || false,
            }
          : null,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("File upload error:", error);

    // Record failed upload metric
    fileUploadsTotal.inc({ success: "false" });

    await logFileEvent("FILE_UPLOADED", false, request, userId, "", {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        message: "Failed to upload file.",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}
