import { NextRequest, NextResponse } from "next/server";

import { requireAuthenticatedUser } from "@/lib/authGuard";
import { prismaClient } from "@/lib/prismaClient";

export async function GET(request: NextRequest) {
  const { session, response } = await requireAuthenticatedUser();
  if (response) {
    return response;
  }

  const userId = session.user.id;

  // Parse query parameters
  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100); // Max 100
  const search = searchParams.get("search") || "";
  const sortBy = searchParams.get("sortBy") || "createdAt";
  const order = searchParams.get("order") || "desc";

  // Build where clause
  const where: {
    userId: string;
    name?: { contains: string; mode?: "insensitive" };
  } = {
    userId,
  };

  if (search) {
    where.name = {
      contains: search,
      mode: "insensitive",
    };
  }

  // Build orderBy clause
  const orderBy:
    | { [key: string]: "asc" | "desc" }
    | Array<{ [key: string]: "asc" | "desc" }> =
    sortBy === "name" || sortBy === "size" || sortBy === "createdAt"
      ? { [sortBy]: order === "asc" ? "asc" : "desc" }
      : { createdAt: "desc" };

  // Get total count
  const total = await prismaClient.file.count({ where });

  // Get files
  const files = await prismaClient.file.findMany({
    where,
    orderBy,
    skip: (page - 1) * limit,
    take: limit,
    select: {
      id: true,
      name: true,
      size: true,
      mimeType: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({
    files,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
