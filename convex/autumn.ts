"use node";

import { Autumn as AutumnComponent } from "@useautumn/convex";
import { Autumn as AutumnSDK } from "autumn-js";
import { components } from "./_generated/api";

// Component-based client for frontend-facing actions (auto-wired with user identity)
export const autumn = new AutumnComponent(components.autumn, {
  identify: async (ctx: { auth: { getUserIdentity: () => Promise<{ subject: string } | null> } }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    return { customerId: identity.subject };
  },
  secretKey: process.env.AUTUMN_SECRET_KEY!,
});

// Raw SDK client for team-level operations (pass customer_id directly)
export function getAutumnSDK() {
  return new AutumnSDK({
    secretKey: process.env.AUTUMN_SECRET_KEY!,
  });
}

// Re-export the auto-wired actions for frontend use
const autumnApi = autumn.api();
export const {
  check,
  track,
  checkout,
  usage,
  billingPortal,
} = autumnApi;
