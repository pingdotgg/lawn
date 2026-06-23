import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

const MAX_ANCESTOR_STEPS = 10;

export function latestProjectUploadAt(
  project: Pick<Doc<"projects">, "latestDescendantUploadAt">,
  newestDirectUploadAt: number | undefined,
) {
  const latest = Math.max(
    project.latestDescendantUploadAt ?? -Infinity,
    newestDirectUploadAt ?? -Infinity,
  );
  return latest === -Infinity ? undefined : latest;
}

export async function propagateProjectUploadRecency(
  ctx: MutationCtx,
  projectId: Id<"projects">,
  uploadedAt: number,
) {
  let project: Doc<"projects"> | null = await ctx.db.get(projectId);
  let steps = 0;

  while (project && steps < MAX_ANCESTOR_STEPS) {
    if ((project.latestDescendantUploadAt ?? -Infinity) < uploadedAt) {
      await ctx.db.patch(project._id, { latestDescendantUploadAt: uploadedAt });
    }
    project = project.parentId ? await ctx.db.get(project.parentId) : null;
    steps += 1;
  }
}

async function recomputeProjectUploadRecency(ctx: MutationCtx, project: Doc<"projects">) {
  const [newestDirectVideo, newestChild] = await Promise.all([
    ctx.db
      .query("videos")
      .withIndex("by_project_and_superseded_by_video_id", (q) =>
        q.eq("projectId", project._id).eq("supersededByVideoId", undefined),
      )
      .order("desc")
      .first(),
    ctx.db
      .query("projects")
      .withIndex("by_team_id_and_parent_id_and_latest_descendant_upload_at", (q) =>
        q
          .eq("teamId", project.teamId)
          .eq("parentId", project._id)
          .gte("latestDescendantUploadAt", 0),
      )
      .order("desc")
      .first(),
  ]);
  const latestDescendantUploadAt = latestProjectUploadAt(
    { latestDescendantUploadAt: newestChild?.latestDescendantUploadAt },
    newestDirectVideo?._creationTime,
  );

  await ctx.db.patch(project._id, {
    latestDescendantUploadAt,
  });
}

export async function recomputeProjectUploadRecencyThroughAncestors(
  ctx: MutationCtx,
  projectId: Id<"projects"> | undefined,
) {
  let project = projectId ? await ctx.db.get(projectId) : null;
  let steps = 0;

  while (project && steps < MAX_ANCESTOR_STEPS) {
    await recomputeProjectUploadRecency(ctx, project);
    project = project.parentId ? await ctx.db.get(project.parentId) : null;
    steps += 1;
  }
}
