import { v } from "convex/values";
import { query } from "./_generated/server";
import { findTeamMembership, getUser } from "./auth";
import { Doc } from "./_generated/dataModel";

function buildCanonicalPath(input: { teamSlug: string; projectId?: string; videoId?: string }) {
  if (input.videoId && input.projectId) {
    return `/dashboard/${input.teamSlug}/${input.projectId}/${input.videoId}`;
  }

  if (input.projectId) {
    return `/dashboard/${input.teamSlug}/${input.projectId}`;
  }

  return `/dashboard/${input.teamSlug}`;
}

export const resolveContext = query({
  args: {
    teamSlug: v.optional(v.string()),
    projectId: v.optional(v.string()),
    videoId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getUser(ctx);
    if (!user) return null;

    const projectId = args.projectId ? ctx.db.normalizeId("projects", args.projectId) : undefined;
    const videoId = args.videoId ? ctx.db.normalizeId("videos", args.videoId) : undefined;
    if ((args.projectId && !projectId) || (args.videoId && !videoId)) {
      return null;
    }

    let team: Doc<"teams"> | null = null;
    let project: Doc<"projects"> | null = null;
    let video: Doc<"videos"> | null = null;

    if (videoId) {
      video = await ctx.db.get(videoId);
      if (!video) return null;

      project = await ctx.db.get(video.projectId);
      if (!project) return null;

      team = await ctx.db.get(project.teamId);
      if (!team) return null;
    } else if (projectId) {
      project = await ctx.db.get(projectId);
      if (!project) return null;

      team = await ctx.db.get(project.teamId);
      if (!team) return null;
    } else if (args.teamSlug) {
      const teamSlug = args.teamSlug;
      team = await ctx.db
        .query("teams")
        .withIndex("by_slug", (q) => q.eq("slug", teamSlug))
        .unique();
      if (!team) return null;
    } else {
      return null;
    }

    const membership = await findTeamMembership(ctx, team._id, user);

    if (!membership) return null;

    const canonicalProjectId = project?._id;
    const canonicalVideoId = video?._id;
    const canonicalPath = buildCanonicalPath({
      teamSlug: team.slug,
      projectId: canonicalProjectId,
      videoId: canonicalVideoId,
    });

    const sameTeamSlug = args.teamSlug === undefined || args.teamSlug === team.slug;
    const sameProjectId = args.projectId === undefined || args.projectId === canonicalProjectId;
    const sameVideoId = args.videoId === undefined || args.videoId === canonicalVideoId;

    const sameProjectVideoChain =
      args.videoId === undefined ||
      args.projectId === undefined ||
      args.projectId === canonicalProjectId;

    return {
      team: {
        ...team,
        role: membership.role,
      },
      project: project ?? undefined,
      video: video ?? undefined,
      canonicalPath,
      isCanonical: sameTeamSlug && sameProjectId && sameVideoId && sameProjectVideoChain,
    };
  },
});
