"use node";

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAutumnSDK } from "./autumn";
import { getIdentity } from "./auth";

export const reclaimStorage = internalAction({
  args: {
    teamId: v.id("teams"),
    bytes: v.number(),
  },
  handler: async (_ctx, args) => {
    if (args.bytes <= 0) return;
    const sdk = getAutumnSDK();
    await sdk.track({
      customer_id: args.teamId,
      feature_id: "storage",
      value: -args.bytes,
    });
  },
});

export const startCheckout = action({
  args: {
    teamId: v.id("teams"),
    productId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await getIdentity(ctx);
    const isAdmin = await ctx.runQuery(internal.billing.verifyTeamAdmin, {
      teamId: args.teamId,
      userClerkId: identity.subject,
    });
    if (!isAdmin) throw new Error("Only team admins can manage billing");

    const sdk = getAutumnSDK();
    return await sdk.checkout({
      customer_id: args.teamId,
      product_id: args.productId,
    });
  },
});

export const openBillingPortal = action({
  args: {
    teamId: v.id("teams"),
  },
  handler: async (ctx, args) => {
    const identity = await getIdentity(ctx);
    const isAdmin = await ctx.runQuery(internal.billing.verifyTeamAdmin, {
      teamId: args.teamId,
      userClerkId: identity.subject,
    });
    if (!isAdmin) throw new Error("Only team admins can manage billing");

    const sdk = getAutumnSDK();
    return await sdk.customers.billingPortal(args.teamId);
  },
});
