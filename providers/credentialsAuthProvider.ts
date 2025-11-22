import Credentials from "next-auth/providers/credentials";

import { verifyPassword } from "@/lib/passwordManager";
import { prismaClient } from "@/lib/prismaClient";

export const credentialsAuthProvider = Credentials({
  name: "Credentials",
  credentials: {
    email: { label: "Email", type: "email" },
    password: { label: "Password", type: "password" },
    totpCode: { label: "TOTP Code", type: "text", optional: true },
  },
  async authorize(credentials) {
    if (!credentials?.email || !credentials?.password) {
      throw new Error("Email and password are required.");
    }

    const user = await prismaClient.user.findUnique({
      where: { email: credentials.email },
      include: { secondFactor: true },
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

    // Check if 2FA is enabled
    const has2FAEnabled = user.secondFactor?.enabled ?? false;

    if (has2FAEnabled) {
      // If 2FA is enabled, TOTP code is required
      if (!credentials.totpCode) {
        // Return user with special flag indicating 2FA is required
        // NextAuth will treat this as an error, so we need a different approach
        // Instead, we'll handle this in the login page
        const error = new Error("2FA_REQUIRED");
        (error as Error & { userId?: string }).userId = user.id;
        throw error;
      }

      // Verify TOTP code if provided
      const { verifyTotpForUser } = await import("@/lib/totpService");
      const verification = await verifyTotpForUser(
        user.id,
        credentials.totpCode,
      );

      if (!verification.valid) {
        throw new Error(verification.error ?? "Invalid 2FA code.");
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...safeUser } = user;
    return safeUser;
  },
});
