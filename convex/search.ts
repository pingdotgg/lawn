import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { query, type QueryCtx } from "./_generated/server";
import { getUser } from "./auth";
import { MAX_FOLDER_DEPTH } from "./projects";
import { matchRank, queryWords } from "./searchText";

const CANDIDATE_LIMIT = 50;
const RESULT_LIMIT = 20;
const RECENT_LIMIT = 5;

// Soft membership check: the palette gets an empty list instead of an error.
async function teamForMember(ctx: QueryCtx, teamSlug: string) {
  const user = await getUser(ctx);
  if (!user) return null;
  const team = await ctx.db
    .query("teams")
    .withIndex("by_slug", (q) => q.eq("slug", teamSlug))
    .unique();
  if (!team) return null;
  const membership = await ctx.db
    .query("teamMembers")
    .withIndex("by_team_and_user", (q) => q.eq("teamId", team._id).eq("userClerkId", user.subject))
    .unique();
  return membership ? team : null;
}

// "Parent / Child" paths, memoized per folder so results in the same folder
// share reads.
function folderPathResolver(ctx: QueryCtx) {
  const cache = new Map<Id<"projects">, Promise<Doc<"projects"> | null>>();
  const getFolder = (id: Id<"projects">) => {
    const cached = cache.get(id);
    if (cached) return cached;
    const folder = ctx.db.get("projects", id);
    cache.set(id, folder);
    return folder;
  };

  return async (id: Id<"projects"> | undefined) => {
    const names: string[] = [];
    let currentId = id;
    while (currentId && names.length <= MAX_FOLDER_DEPTH) {
      const folder = await getFolder(currentId);
      if (!folder) break;
      names.unshift(folder.name);
      currentId = folder.parentId;
    }
    return names.join(" / ");
  };
}

async function toResult(
  ctx: QueryCtx,
  entry: Doc<"searchEntries">,
  pathFor: ReturnType<typeof folderPathResolver>,
) {
  if (entry.kind === "video") {
    return {
      kind: "video" as const,
      id: entry._id,
      title: entry.title,
      projectId: entry.projectId,
      videoId: entry.videoId,
      path: await pathFor(entry.projectId),
    };
  }
  const folder = await ctx.db.get("projects", entry.projectId);
  return {
    kind: "folder" as const,
    id: entry._id,
    title: entry.title,
    projectId: entry.projectId,
    path: await pathFor(folder?.parentId),
  };
}

export const search = query({
  args: { teamSlug: v.string(), query: v.string() },
  handler: async (ctx, args) => {
    const words = queryWords(args.query);
    if (words.length === 0) return [];
    const team = await teamForMember(ctx, args.teamSlug);
    if (!team) return [];

    const candidates = await ctx.db
      .query("searchEntries")
      .withSearchIndex("search_search_text", (q) =>
        q.search("searchText", words.join(" ")).eq("teamId", team._id),
      )
      .take(CANDIDATE_LIMIT);

    // Re-rank by how well the title matches, keeping Convex relevance as the
    // tiebreak. Partial matches only show when nothing matches every word.
    const ranked = candidates
      .map((entry, index) => ({ entry, index, rank: matchRank(entry.title, words) }))
      .filter((candidate) => candidate.rank < 4);
    const hasFullMatch = ranked.some((candidate) => candidate.rank <= 2);
    const kept = ranked
      .filter((candidate) => !hasFullMatch || candidate.rank <= 2)
      .sort((a, b) => a.rank - b.rank || a.index - b.index)
      .slice(0, RESULT_LIMIT);

    const pathFor = folderPathResolver(ctx);
    return await Promise.all(kept.map(({ entry }) => toResult(ctx, entry, pathFor)));
  },
});

export const recent = query({
  args: { teamSlug: v.string() },
  handler: async (ctx, args) => {
    const team = await teamForMember(ctx, args.teamSlug);
    if (!team) return [];
    const entries = await ctx.db
      .query("searchEntries")
      .withIndex("by_team_id_and_kind_and_sort_at", (q) =>
        q.eq("teamId", team._id).eq("kind", "video"),
      )
      .order("desc")
      .take(RECENT_LIMIT);
    const pathFor = folderPathResolver(ctx);
    return await Promise.all(entries.map((entry) => toResult(ctx, entry, pathFor)));
  },
});
