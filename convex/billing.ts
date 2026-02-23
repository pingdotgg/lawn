import { v } from "convex/values";
import { internalQuery, query } from "./_generated/server";
import { requireTeamAccess } from "./auth";

export const getTeamStorage = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    await requireTeamAccess(ctx, args.teamId);

    const projects = await ctx.db
      .query("projects")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();

    let totalBytes = 0;
    for (const project of projects) {
      const videos = await ctx.db
        .query("videos")
        .withIndex("by_project", (q) => q.eq("projectId", project._id))
        .collect();

      for (const video of videos) {
        totalBytes += video.fileSize ?? 0;
      }
    }

    return { totalBytes };
  },
});

export const verifyTeamAdmin = internalQuery({
  args: {
    teamId: v.id("teams"),
    userClerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const membership = await ctx.db
      .query("teamMembers")
      .withIndex("by_team_and_user", (q) =>
        q.eq("teamId", args.teamId).eq("userClerkId", args.userClerkId)
      )
      .unique();

    if (!membership) return false;
    return membership.role === "owner" || membership.role === "admin";
  },
});
