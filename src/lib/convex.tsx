"use client";

import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { useAuth } from "@clerk/tanstack-react-start";
import type { ReactNode } from "react";
import { ClerkClientProvider } from "@/lib/clerk";

const convexUrl = import.meta.env.VITE_CONVEX_URL;

if (!convexUrl) {
  throw new Error("Missing VITE_CONVEX_URL");
}

const convex = new ConvexReactClient(convexUrl);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}

export function ClerkConvexProvider({ children }: { children: ReactNode }) {
  return (
    <ClerkClientProvider>
      <ConvexClientProvider>{children}</ConvexClientProvider>
    </ClerkClientProvider>
  );
}

export { convex };
