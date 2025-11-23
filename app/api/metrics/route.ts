import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/authGuard";
import { register } from "@/lib/metrics";

/**
 * GET /api/metrics
 * Prometheus metrics endpoint (admin only)
 */
export async function GET() {
  // Require admin access for metrics
  const { response } = await requireAdmin();
  if (response) {
    return response;
  }

  try {
    const metrics = await register.metrics();
    return new NextResponse(metrics, {
      status: 200,
      headers: {
        "Content-Type": register.contentType,
      },
    });
  } catch (error) {
    console.error("Error generating metrics:", error);
    return NextResponse.json(
      {
        error: "Failed to generate metrics",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
