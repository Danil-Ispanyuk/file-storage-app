import { NextRequest, NextResponse } from "next/server";
import { validateShareToken } from "@/lib/fileSharing";
import { prismaClient } from "@/lib/prismaClient";

/**
 * GET /api/files/shared/[token]/info
 * Get share metadata (permission, file info) without downloading the file
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  try {
    // Validate token and get share info
    const shareInfo = await validateShareToken(token);
    if (!shareInfo) {
      return NextResponse.json(
        { message: "Invalid or expired share token." },
        { status: 404 },
      );
    }

    // Get file metadata
    const file = await prismaClient.file.findUnique({
      where: { id: shareInfo.fileId },
      select: {
        id: true,
        name: true,
        size: true,
        mimeType: true,
        createdAt: true,
      },
    });

    if (!file) {
      return NextResponse.json({ message: "File not found." }, { status: 404 });
    }

    return NextResponse.json(
      {
        permission: shareInfo.permission,
        file: {
          id: file.id,
          name: file.name,
          size: file.size,
          mimeType: file.mimeType,
          createdAt: file.createdAt,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Get share info error:", error);

    return NextResponse.json(
      {
        message: "Failed to get share information.",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
