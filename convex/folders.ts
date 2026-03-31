import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireProjectAccess, requireFolderAccess } from "./auth";

export const list = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    await requireProjectAccess(ctx, args.projectId);

    const folders = await ctx.db
      .query("folders")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    // Get video counts for each folder
    const foldersWithCounts = await Promise.all(
      folders.map(async (folder) => {
        const videos = await ctx.db
          .query("videos")
          .withIndex("by_project_and_folder", (q) =>
            q.eq("projectId", args.projectId).eq("folderId", folder._id)
          )
          .collect();
        return {
          ...folder,
          videoCount: videos.length,
        };
      })
    );

    return foldersWithCounts;
  },
});

export const get = query({
  args: { folderId: v.id("folders") },
  handler: async (ctx, args) => {
    const { folder } = await requireFolderAccess(ctx, args.folderId);
    return folder;
  },
});

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireProjectAccess(ctx, args.projectId, "member");

    return await ctx.db.insert("folders", {
      projectId: args.projectId,
      name: args.name,
      createdByClerkId: user.subject,
    });
  },
});

export const rename = mutation({
  args: {
    folderId: v.id("folders"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    await requireFolderAccess(ctx, args.folderId, "member");
    await ctx.db.patch(args.folderId, { name: args.name });
  },
});

export const remove = mutation({
  args: { folderId: v.id("folders") },
  handler: async (ctx, args) => {
    const { folder } = await requireFolderAccess(ctx, args.folderId, "admin");

    // Cascade delete all videos in this folder
    const videos = await ctx.db
      .query("videos")
      .withIndex("by_project_and_folder", (q) =>
        q.eq("projectId", folder.projectId).eq("folderId", args.folderId)
      )
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

      // Delete share links and their access grants
      const shareLinks = await ctx.db
        .query("shareLinks")
        .withIndex("by_video", (q) => q.eq("videoId", video._id))
        .collect();
      for (const link of shareLinks) {
        const grants = await ctx.db
          .query("shareAccessGrants")
          .withIndex("by_share_link", (q) => q.eq("shareLinkId", link._id))
          .collect();
        for (const grant of grants) {
          await ctx.db.delete(grant._id);
        }
        await ctx.db.delete(link._id);
      }

      await ctx.db.delete(video._id);
    }

    // Delete the folder itself
    await ctx.db.delete(args.folderId);
  },
});
