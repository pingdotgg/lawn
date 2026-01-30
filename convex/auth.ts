import { QueryCtx, MutationCtx, ActionCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export async function getUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .unique();

  return user;
}

export async function requireUser(ctx: QueryCtx | MutationCtx) {
  const user = await getUser(ctx);
  if (!user) {
    throw new Error("Not authenticated");
  }
  return user;
}

export async function getIdentity(ctx: ActionCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }
  return identity;
}

const ROLE_HIERARCHY = {
  owner: 4,
  admin: 3,
  member: 2,
  viewer: 1,
} as const;

type Role = keyof typeof ROLE_HIERARCHY;

export async function requireTeamAccess(
  ctx: QueryCtx | MutationCtx,
  teamId: Id<"teams">,
  requiredRole?: Role
) {
  const user = await requireUser(ctx);

  const membership = await ctx.db
    .query("teamMembers")
    .withIndex("by_team_and_user", (q) =>
      q.eq("teamId", teamId).eq("userId", user._id)
    )
    .unique();

  if (!membership) {
    throw new Error("Not a team member");
  }

  if (requiredRole && ROLE_HIERARCHY[membership.role] < ROLE_HIERARCHY[requiredRole]) {
    throw new Error(`Requires ${requiredRole} role or higher`);
  }

  return { user, membership };
}

export async function requireProjectAccess(
  ctx: QueryCtx | MutationCtx,
  projectId: Id<"projects">,
  requiredRole?: Role
) {
  const user = await requireUser(ctx);

  const project = await ctx.db.get(projectId);
  if (!project) {
    throw new Error("Project not found");
  }

  const { membership } = await requireTeamAccess(ctx, project.teamId, requiredRole);

  return { user, membership, project };
}

export async function requireVideoAccess(
  ctx: QueryCtx | MutationCtx,
  videoId: Id<"videos">,
  requiredRole?: Role
) {
  const user = await requireUser(ctx);

  const video = await ctx.db.get(videoId);
  if (!video) {
    throw new Error("Video not found");
  }

  const { membership, project } = await requireProjectAccess(ctx, video.projectId, requiredRole);

  return { user, membership, project, video };
}
