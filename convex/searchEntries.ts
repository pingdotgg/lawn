import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { buildSearchText } from "./searchText";

// Keeps the `searchEntries` row for one folder in sync with its source doc.
// Pass `null` when the folder was deleted.
export async function syncFolderEntry(
  ctx: MutationCtx,
  projectId: Id<"projects">,
  project: Doc<"projects"> | null,
) {
  const existing = await ctx.db
    .query("searchEntries")
    .withIndex("by_kind_and_project_id", (q) => q.eq("kind", "folder").eq("projectId", projectId))
    .unique();
  if (!project) {
    if (existing) await ctx.db.delete("searchEntries", existing._id);
    return;
  }

  const entry = {
    kind: "folder" as const,
    teamId: project.teamId,
    projectId,
    title: project.name,
    searchText: buildSearchText(project.name),
    sortAt: project._creationTime,
  };
  if (existing) await ctx.db.replace("searchEntries", existing._id, entry);
  else await ctx.db.insert("searchEntries", entry);
}

// Keeps the `searchEntries` row for one video in sync. Only the latest version
// of a stack is searchable, so superseded or deleted videos lose their entry.
export async function syncVideoEntry(
  ctx: MutationCtx,
  videoId: Id<"videos">,
  video: Doc<"videos"> | null,
) {
  const existing = await ctx.db
    .query("searchEntries")
    .withIndex("by_video_id", (q) => q.eq("videoId", videoId))
    .unique();
  const project =
    video && video.supersededByVideoId === undefined
      ? await ctx.db.get("projects", video.projectId)
      : null;
  if (!video || !project) {
    if (existing) await ctx.db.delete("searchEntries", existing._id);
    return;
  }

  const entry = {
    kind: "video" as const,
    videoId,
    teamId: project.teamId,
    projectId: video.projectId,
    title: video.title,
    searchText: buildSearchText(video.title),
    sortAt: video._creationTime,
  };
  if (existing) await ctx.db.replace("searchEntries", existing._id, entry);
  else await ctx.db.insert("searchEntries", entry);
}
