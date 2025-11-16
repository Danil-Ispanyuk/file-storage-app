import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";

const UNAUTHORIZED_RESPONSE = NextResponse.json(
  { message: "Unauthorized" },
  { status: 401 },
);

export async function requireAuthenticatedUser() {
  const session = await auth();

  if (!session?.user) {
    return { session: null, response: UNAUTHORIZED_RESPONSE };
  }

  return { session, response: null };
}
