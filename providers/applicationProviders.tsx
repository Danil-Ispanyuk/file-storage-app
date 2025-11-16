"use client";

import type { ApplicationProvidersProps } from "@/types/providerTypes";

import { QueryClientProviderWrapper } from "./queryClientProvider";
import { SessionProviderWrapper } from "./sessionProvider";

export function ApplicationProviders({ children }: ApplicationProvidersProps) {
  return (
    <SessionProviderWrapper>
      <QueryClientProviderWrapper>{children}</QueryClientProviderWrapper>
    </SessionProviderWrapper>
  );
}
