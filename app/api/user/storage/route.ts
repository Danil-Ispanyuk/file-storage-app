import { NextRequest, NextResponse } from "next/server";

import { requireAuthenticatedUser } from "@/lib/authGuard";
import { getUserStorageStats } from "@/lib/storageQuota";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
  const { session, response } = await requireAuthenticatedUser();
  if (response) {
    return response;
  }

  const userId = session.user.id;

  try {
    const stats = await getUserStorageStats(userId);

    return NextResponse.json(stats, { status: 200 });
  } catch (error) {
    console.error("Storage stats error:", error);

    return NextResponse.json(
      {
        message: "Failed to get storage statistics.",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
