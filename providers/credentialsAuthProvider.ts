import Credentials from "next-auth/providers/credentials";

import { verifyPassword } from "@/lib/passwordManager";
import { prismaClient } from "@/lib/prismaClient";

export const credentialsAuthProvider = Credentials({
  name: "Credentials",
  credentials: {
    email: { label: "Email", type: "email" },
    password: { label: "Password", type: "password" },
  },
  async authorize(credentials) {
    if (!credentials?.email || !credentials?.password) {
      throw new Error("Email and password are required.");
    }

    const user = await prismaClient.user.findUnique({
      where: { email: credentials.email },
    });

    if (!user?.password) {
      throw new Error("Invalid credentials.");
    }

    const isPasswordValid = await verifyPassword(
      credentials.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new Error("Invalid credentials.");
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...safeUser } = user;
    return safeUser;
  },
});
