import { mutation, query } from "./_generated/server";
import { getUser } from "./auth";

export const check = query({
  args: {},
  handler: async (ctx) => {
    const user = await getUser(ctx);
    if (!user) return null;

    const record = await ctx.db
      .query("userAllowed")
      .withIndex("by_user", (q) => q.eq("userId", user.subject))
      .unique();

    return record?.allowed ?? false;
  },
});

export const ensure = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getUser(ctx);
    if (!user) return;

    const existing = await ctx.db
      .query("userAllowed")
      .withIndex("by_user", (q) => q.eq("userId", user.subject))
      .unique();

    if (existing) return;

    await ctx.db.insert("userAllowed", {
      userId: user.subject,
      allowed: false,
    });
  },
});
