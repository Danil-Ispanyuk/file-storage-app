import NextAuth from "next-auth";

import { authConfig } from "@/lib/authConfig";

// For route handlers: NextAuth() returns a function
// This is used in app/api/auth/[...nextauth]/route.ts
export const handler = NextAuth(authConfig);

// For server components and server actions: we need to initialize separately
// NextAuth returns different things depending on context
// Let's use getServerSession instead for server components
import { getServerSession } from "next-auth/next";

export async function auth() {
  return await getServerSession(authConfig);
}

// For server actions - need to use redirect with signOut
import { redirect } from "next/navigation";

export async function signOut() {
  // In server actions, we need to call the signOut API endpoint
  // and then redirect
  redirect("/api/auth/signout");
}
