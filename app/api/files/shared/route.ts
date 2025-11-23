import { NextRequest, NextResponse } from "next/server";

import { requireAuthenticatedUser } from "@/lib/authGuard";
import { getSharedFiles, getUserInfo } from "@/lib/fileSharing";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
  const { session, response } = await requireAuthenticatedUser();
  if (response) {
    return response;
  }

  const userId = session.user.id;

  try {
    const sharedFiles = await getSharedFiles(userId);

    // Get user info for each share
    const filesWithUserInfo = await Promise.all(
      sharedFiles.map(async (share) => {
        const sharedByUser = await getUserInfo(share.sharedBy);
        return {
          id: share.file.id,
          name: share.file.name,
          size: share.file.size,
          mimeType: share.file.mimeType,
          createdAt: share.file.createdAt,
          sharedBy: {
            id: share.sharedBy,
            email: sharedByUser?.email || "Unknown",
            name: sharedByUser?.name || null,
          },
          permission: share.permission,
          shareId: share.id,
          expiresAt: share.expiresAt,
          shareCreatedAt: share.createdAt,
        };
      }),
    );

    // Group by sharedBy email for tabs
    const groupedByUser = filesWithUserInfo.reduce(
      (acc, file) => {
        const key = file.sharedBy.email;
        if (!acc[key]) {
          acc[key] = {
            sharedBy: file.sharedBy,
            files: [],
          };
        }
        acc[key].files.push(file);
        return acc;
      },
      {} as Record<
        string,
        {
          sharedBy: (typeof filesWithUserInfo)[0]["sharedBy"];
          files: typeof filesWithUserInfo;
        }
      >,
    );

    return NextResponse.json(
      {
        files: filesWithUserInfo,
        grouped: Object.values(groupedByUser),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Get shared files error:", error);

    return NextResponse.json(
      {
        message: "Failed to get shared files.",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
