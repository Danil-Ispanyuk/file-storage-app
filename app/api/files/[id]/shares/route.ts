import { NextRequest, NextResponse } from "next/server";

import { requireAuthenticatedUser } from "@/lib/authGuard";
import { prismaClient } from "@/lib/prismaClient";
import { getFileShares } from "@/lib/fileSharing";

export async function GET(
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
      return NextResponse.json(
        { message: "Permission denied. Only file owner can view shares." },
        { status: 403 },
      );
    }

    // Get all shares for this file
    const shares = await getFileShares(fileId);

    // Get user info for sharedWith
    const sharesWithUserInfo = await Promise.all(
      shares.map(async (share) => {
        if (!share.sharedWith) {
          return {
            ...share,
            sharedWithUser: null,
          };
        }

        const user = await prismaClient.user.findUnique({
          where: { id: share.sharedWith! },
          select: {
            id: true,
            email: true,
            name: true,
          },
        });

        return {
          ...share,
          sharedWithUser: user,
        };
      }),
    );

    return NextResponse.json({ shares: sharesWithUserInfo }, { status: 200 });
  } catch (error) {
    console.error("Get file shares error:", error);

    return NextResponse.json(
      {
        message: "Failed to get file shares.",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
