import { NextResponse } from "next/server";

import { hashPassword } from "@/lib/passwordManager";
import { prismaClient } from "@/lib/prismaClient";
import { registerUserSchema } from "@/types/auth";

export async function POST(request: Request) {
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

  return NextResponse.json(
    {
      message: "User registered successfully.",
      user: createdUser,
    },
    { status: 201 },
  );
}
