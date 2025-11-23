import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/authGuard";
import { prismaClient } from "@/lib/prismaClient";
import { Role } from "@prisma/client";

/**
 * GET /api/admin/users
 * Get list of all users (admin only)
 */
export async function GET(request: NextRequest) {
  const { response } = await requireAdmin();
  if (response) {
    return response;
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "20", 10),
      100,
    );
    const search = searchParams.get("search") || "";
    const role = searchParams.get("role") || "";

    // Build where clause
    const where: {
      OR?: Array<{
        email?: { contains: string; mode: "insensitive" };
        name?: { contains: string; mode: "insensitive" };
      }>;
      role?: Role;
    } = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
      ];
    }

    if (role) {
      where.role = role as Role;
    }

    // Get total count
    const total = await prismaClient.user.count({ where });

    // Get users
    const users = await prismaClient.user.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerified: true,
        storageQuota: true,
        usedStorage: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            files: true,
            auditLogs: true,
          },
        },
      },
    });

    // Get statistics
    const stats = await prismaClient.user.groupBy({
      by: ["role"],
      _count: true,
    });

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: stats.reduce(
        (acc, stat) => {
          acc[stat.role] = stat._count;
          return acc;
        },
        {} as Record<string, number>,
      ),
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      {
        message: "Failed to fetch users.",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
