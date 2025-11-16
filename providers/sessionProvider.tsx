"use client";

import { SessionProvider } from "next-auth/react";

import type { SessionProviderWrapperProps } from "@/types/providerTypes";

export function SessionProviderWrapper({
  children,
}: SessionProviderWrapperProps) {
  return <SessionProvider>{children}</SessionProvider>;
}
