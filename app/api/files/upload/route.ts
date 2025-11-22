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
    const buffer = Buffer.from(bytes);

    // Validate file
    const validation = validateFile(file.size, file.type, file.name);
    if (!validation.valid) {
      await logFileEvent("FILE_UPLOADED", false, request, userId, "", {
        error: validation.error,
      });

      return NextResponse.json({ message: validation.error }, { status: 400 });
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
        size: buffer.length, // Original size (before encryption)
        mimeType: file.type,
        hash,
        encrypted: true,
        encryptionKey: encryptedFileKey,
      },
    });

    // Log successful upload
    await logFileEvent("FILE_UPLOADED", true, request, userId, savedFile.id, {
      fileName: file.name,
      size: file.size,
      mimeType: file.type,
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
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("File upload error:", error);

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
