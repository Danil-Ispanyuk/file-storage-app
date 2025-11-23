import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/authGuard";
import { prismaClient } from "@/lib/prismaClient";
import { AuditAction } from "@prisma/client";

/**
 * GET /api/admin/audit-logs
 * Get audit logs with filtering (admin only)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
  const { response } = await requireAdmin();
  if (response) {
    return response;
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "50", 10),
      100,
    );
    const action = searchParams.get("action") || "";
    const userId = searchParams.get("userId") || "";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";
    const success = searchParams.get("success");
    const search = searchParams.get("search") || "";

    // Build where clause
    const where: {
      action?: AuditAction;
      userId?: string;
      success?: boolean;
      createdAt?: { gte?: Date; lte?: Date };
      OR?: Array<{
        metadata?: { contains: string; mode?: "insensitive" };
      }>;
    } = {};

    if (action) {
      where.action = action as AuditAction;
    }

    if (userId) {
      where.userId = userId;
    }

    if (success !== null && success !== "") {
      where.success = success === "true";
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    if (search) {
      where.OR = [
        {
          metadata: {
            contains: search,
            mode: "insensitive",
          },
        },
      ];
    }

    // Get total count
    const total = await prismaClient.auditLog.count({ where });

    // Get audit logs
    const logs = await prismaClient.auditLog.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    // Get statistics
    const stats = await prismaClient.auditLog.groupBy({
      by: ["action", "success"],
      _count: true,
    });

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: stats.reduce(
        (acc, stat) => {
          const key = `${stat.action}_${stat.success}`;
          acc[key] = stat._count;
          return acc;
        },
        {} as Record<string, number>,
      ),
    });
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return NextResponse.json(
      {
        message: "Failed to fetch audit logs.",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
