import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireTeamAccess, requireProjectAccess } from "./auth";

export const create = mutation({
  args: {
    teamId: v.id("teams"),
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireTeamAccess(ctx, args.teamId, "member");

    const team = await ctx.db.get(args.teamId);
    if (!team) throw new Error("Team not found");

    // Check plan limits for free tier
    if (team.plan === "free") {
      const existingProjects = await ctx.db
        .query("projects")
        .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
        .collect();

      if (existingProjects.length >= 1) {
        throw new Error("Free plan is limited to 1 project. Upgrade to create more.");
      }
    }

    return await ctx.db.insert("projects", {
      teamId: args.teamId,
      name: args.name,
      description: args.description,
    });
  },
});

export const list = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    await requireTeamAccess(ctx, args.teamId);

    const projects = await ctx.db
      .query("projects")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();

    // Get video counts for each project
    const projectsWithCounts = await Promise.all(
      projects.map(async (project) => {
        const videos = await ctx.db
          .query("videos")
          .withIndex("by_project", (q) => q.eq("projectId", project._id))
          .collect();
        return {
          ...project,
          videoCount: videos.length,
        };
      })
    );

    return projectsWithCounts;
  },
});

export const get = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const { project, membership } = await requireProjectAccess(ctx, args.projectId);
    return { ...project, role: membership.role };
  },
});

export const update = mutation({
  args: {
    projectId: v.id("projects"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireProjectAccess(ctx, args.projectId, "member");

    const updates: Partial<{ name: string; description: string }> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;

    await ctx.db.patch(args.projectId, updates);
  },
});

export const remove = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    await requireProjectAccess(ctx, args.projectId, "admin");

    // Delete all videos in the project
    const videos = await ctx.db
      .query("videos")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    for (const video of videos) {
      // Delete comments
      const comments = await ctx.db
        .query("comments")
        .withIndex("by_video", (q) => q.eq("videoId", video._id))
        .collect();
      for (const comment of comments) {
        await ctx.db.delete(comment._id);
      }

      // Delete share links
      const shareLinks = await ctx.db
        .query("shareLinks")
        .withIndex("by_video", (q) => q.eq("videoId", video._id))
        .collect();
      for (const link of shareLinks) {
        await ctx.db.delete(link._id);
      }

      await ctx.db.delete(video._id);
    }

    await ctx.db.delete(args.projectId);
  },
});
