import type { Adapter } from "next-auth/adapters";
import type { NextAuthOptions } from "next-auth";

import { PrismaAdapter } from "@auth/prisma-adapter";

import { credentialsAuthProvider } from "@/providers/credentialsAuthProvider";
import { env } from "@/lib/env";
import { prismaClient } from "@/lib/prismaClient";

const ROLE_VALUES = ["ADMIN", "MANAGER", "USER", "GUEST"] as const;
type UserRole = (typeof ROLE_VALUES)[number];

const getResolvedRole = (...candidates: Array<unknown>): UserRole => {
  for (const candidate of candidates) {
    if (
      typeof candidate === "string" &&
      ROLE_VALUES.includes(candidate as UserRole)
    ) {
      return candidate as UserRole;
    }
  }

  return "USER";
};

export const authConfig: NextAuthOptions = {
  adapter: PrismaAdapter(prismaClient) as Adapter,
  session: {
    strategy: "jwt", // Credentials provider requires JWT strategy
    maxAge: 15 * 60, // 15 minutes (according to security requirements - short-lived tokens)
  },
  secret: env.AUTH_SECRET,
  providers: [credentialsAuthProvider],
  pages: {
    signIn: "/auth/login",
    // NextAuth will handle signOut and error pages automatically
    // but you can customize them if needed:
    // signOut: "/auth/logout",
    // error: "/auth/error",
  },
  callbacks: {
    async session({ session, token }) {
      // With JWT strategy, user data comes from token, not user object
      if (session.user && token) {
        session.user.id = token.sub ?? session.user.id ?? "";
        session.user.role = getResolvedRole(token.role);
      }
      return session;
    },
    async jwt({ token, user }) {
      // When user first signs in, user object is available
      if (user) {
        token.id = user.id;
        token.role = getResolvedRole(user.role);
      }
      // On subsequent requests, only token is available
      return token;
    },
  },
  events: {
    async signOut({ token }) {
      // Log logout event
      // Note: We don't have access to request object here, so we log with limited info
      try {
        const { logAuthEvent } = await import("@/lib/auditLog");
        // Create a minimal request-like object for logging
        const mockRequest = new Request("http://localhost", {
          method: "POST",
          headers: {},
        });
        await logAuthEvent("LOGOUT", true, mockRequest, token?.sub ?? null, {
          note: "Logged via NextAuth signOut event",
        });
      } catch (error) {
        // Don't break signout if logging fails
        console.error("Failed to log logout event:", error);
      }
    },
  },
};
