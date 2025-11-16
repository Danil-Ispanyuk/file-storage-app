import type { Adapter } from "next-auth/adapters";
import type { NextAuthOptions } from "next-auth";

import { PrismaAdapter } from "@auth/prisma-adapter";

import { credentialsAuthProvider } from "@/providers/credentialsAuthProvider";
import { env } from "@/lib/env";
import { prismaClient } from "@/lib/prismaClient";

const ROLE_VALUES = ["ADMIN", "USER"] as const;
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
    strategy: "database",
  },
  secret: env.AUTH_SECRET,
  providers: [credentialsAuthProvider],
  callbacks: {
    async session({ session, user, token }) {
      if (session.user) {
        const resolvedRole = getResolvedRole(
          user?.role,
          token?.role,
          session.user.role,
        );
        session.user.id = user?.id ?? token?.sub ?? session.user.id;
        session.user.role = resolvedRole ?? session.user.role;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = getResolvedRole(user.role);
      } else if (token.role) {
        token.role = getResolvedRole(token.role);
      }
      return token;
    },
  },
};
