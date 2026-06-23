import { internalQuery, query, type QueryCtx } from "./_generated/server";
import { getUser } from "./auth";

export function normalizeDashboardSortText(value: string) {
  return value.normalize("NFKD").toLocaleLowerCase("en-US");
}

export async function isAlphabeticalSortReady(ctx: QueryCtx) {
  const legacyVideo = await ctx.db
    .query("videos")
    .withIndex("by_sort_title", (q) => q.eq("sortTitle", undefined))
    .first();
  return legacyVideo === null;
}

export const isAlphabeticalReady = query({
  args: {},
  handler: async (ctx) => {
    const user = await getUser(ctx);
    if (!user) return false;
    return await isAlphabeticalSortReady(ctx);
  },
});

export const verifyAlphabeticalReady = internalQuery({
  args: {},
  handler: isAlphabeticalSortReady,
});
