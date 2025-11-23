import { NextRequest, NextResponse } from "next/server";

import { logAuthEvent, logRateLimitExceeded } from "@/lib/auditLog";
import { hashPassword } from "@/lib/passwordManager";
import {
  checkRateLimit,
  getClientIP,
  registerRateLimit,
} from "@/lib/rateLimit";
import { prismaClient } from "@/lib/prismaClient";
import { registerUserSchema } from "@/types/auth";
import { authAttemptsTotal } from "@/lib/metrics";

export async function POST(request: NextRequest) {
  // Rate limiting: max 3 registrations per hour per IP
  const clientIP = getClientIP(request);
  const rateLimitResult = await checkRateLimit(registerRateLimit, clientIP);

  if (!rateLimitResult.success) {
    // Log rate limit exceeded
    await logRateLimitExceeded(request, "/api/auth/register", clientIP);

    const resetTime = rateLimitResult.reset
      ? new Date(rateLimitResult.reset).toISOString()
      : "soon";
    return NextResponse.json(
      {
        message: `Too many registration attempts. Please try again after ${resetTime}.`,
        rateLimitExceeded: true,
        reset: rateLimitResult.reset,
      },
      {
        status: 429,
        headers: {
          "Retry-After": rateLimitResult.reset
            ? String(Math.ceil((rateLimitResult.reset - Date.now()) / 1000))
            : "3600",
          "X-RateLimit-Limit": String(rateLimitResult.limit ?? 3),
          "X-RateLimit-Remaining": String(rateLimitResult.remaining ?? 0),
          "X-RateLimit-Reset": String(
            rateLimitResult.reset ?? Date.now() + 3600000,
          ),
        },
      },
    );
  }

  const body = await request.json();
  const parseResult = registerUserSchema.safeParse(body);

  if (!parseResult.success) {
    return NextResponse.json(
      {
        message: "Invalid payload.",
        issues: parseResult.error.format(),
      },
      { status: 400 },
    );
  }

  const { email, password, name } = parseResult.data;

  const existingUser = await prismaClient.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    authAttemptsTotal.inc({ type: "register", success: "false" });
    return NextResponse.json(
      { message: "User with this email already exists." },
      { status: 409 },
    );
  }

  const hashedPassword = await hashPassword(password);
  const createdUser = await prismaClient.user.create({
    data: {
      email,
      name,
      password: hashedPassword,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
  });

  // Record metrics
  authAttemptsTotal.inc({ type: "register", success: "true" });

  // Log successful registration
  await logAuthEvent("REGISTER", true, request, createdUser.id, {
    email: createdUser.email,
    name: createdUser.name,
  });

  return NextResponse.json(
    {
      message: "User registered successfully.",
      user: createdUser,
    },
    { status: 201 },
  );
}
