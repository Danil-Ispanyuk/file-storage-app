import { NextResponse } from "next/server";
import { prismaClient } from "@/lib/prismaClient";

/**
 * GET /api/health
 * Health check endpoint for Docker/Kubernetes
 */
export async function GET() {
  try {
    // Перевірити з'єднання з БД
    await prismaClient.$queryRaw`SELECT 1`;

    return NextResponse.json(
      {
        status: "healthy",
        timestamp: new Date().toISOString(),
        database: "connected",
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        database: "disconnected",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 503 },
    );
  }
}
