import { QueryCtx, MutationCtx, ActionCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

type ClerkIdentity = NonNullable<
  Awaited<ReturnType<QueryCtx["auth"]["getUserIdentity"]>>
>;

function hasString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

export function identityName(identity: ClerkIdentity): string {
  if (hasString((identity as { name?: unknown }).name)) {
    return (identity as { name: string }).name;
  }
  if (
    hasString((identity as { firstName?: unknown }).firstName) &&
    hasString((identity as { lastName?: unknown }).lastName)
  ) {
    return `${(identity as { firstName: string }).firstName} ${(identity as { lastName: string }).lastName}`;
  }
  if (hasString((identity as { email?: unknown }).email)) {
    return (identity as { email: string }).email;
  }
  return "Unknown";
}

export function identityEmail(identity: ClerkIdentity): string {
  if (hasString((identity as { email?: unknown }).email)) {
    return (identity as { email: string }).email;
  }
  return "";
}

export function identityAvatarUrl(identity: ClerkIdentity): string | undefined {
  if (hasString((identity as { imageUrl?: unknown }).imageUrl)) {
    return (identity as { imageUrl: string }).imageUrl;
  }
  if (hasString((identity as { avatarUrl?: unknown }).avatarUrl)) {
    return (identity as { avatarUrl: string }).avatarUrl;
  }
  return undefined;
}

export async function getUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }

  return identity;
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
      q.eq("teamId", teamId).eq("userClerkId", user.subject)
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
