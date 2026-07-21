import { QueryCtx, MutationCtx, ActionCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

type ClerkIdentity = NonNullable<Awaited<ReturnType<QueryCtx["auth"]["getUserIdentity"]>>>;

function hasString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function getOptionalString(identity: ClerkIdentity, key: string): string | undefined {
  const value = (identity as Record<string, unknown>)[key];
  return hasString(value) ? value : undefined;
}

export function identityName(identity: ClerkIdentity): string {
  const name = getOptionalString(identity, "name");
  if (name) return name;

  const firstName = getOptionalString(identity, "firstName");
  const lastName = getOptionalString(identity, "lastName");
  if (firstName && lastName) return `${firstName} ${lastName}`;

  const email = getOptionalString(identity, "email");
  if (email) return email;

  return "Unknown";
}

export function identityEmail(identity: ClerkIdentity): string {
  return getOptionalString(identity, "email") ?? "";
}

export function identityAvatarUrl(identity: ClerkIdentity): string | undefined {
  return getOptionalString(identity, "pictureUrl");
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

export function identityKey(identity: ClerkIdentity) {
  return identity.tokenIdentifier;
}

export function identityMatches(
  identity: ClerkIdentity,
  canonicalIdentity: string | undefined,
  legacySubject: string,
) {
  return canonicalIdentity !== undefined
    ? canonicalIdentity === identity.tokenIdentifier
    : legacySubject === identity.subject;
}

export async function findTeamMembership(
  ctx: QueryCtx | MutationCtx,
  teamId: Id<"teams">,
  identity: ClerkIdentity,
) {
  const canonical = await ctx.db
    .query("teamMembers")
    .withIndex("by_team_and_identity", (q) =>
      q.eq("teamId", teamId).eq("userIdentity", identity.tokenIdentifier),
    )
    .unique();
  if (canonical) return canonical;

  const legacy = await ctx.db
    .query("teamMembers")
    .withIndex("by_team_and_user", (q) =>
      q.eq("teamId", teamId).eq("userClerkId", identity.subject),
    )
    .unique();
  return legacy?.userIdentity === undefined ? legacy : null;
}

export async function listMembershipsForIdentity(
  ctx: QueryCtx | MutationCtx,
  identity: ClerkIdentity,
): Promise<Doc<"teamMembers">[]> {
  const [canonical, legacy] = await Promise.all([
    ctx.db
      .query("teamMembers")
      .withIndex("by_identity", (q) => q.eq("userIdentity", identity.tokenIdentifier))
      .collect(),
    ctx.db
      .query("teamMembers")
      .withIndex("by_user", (q) => q.eq("userClerkId", identity.subject))
      .collect(),
  ]);

  return [
    ...canonical,
    ...legacy.filter(
      (membership) =>
        membership.userIdentity === undefined &&
        !canonical.some((candidate) => candidate._id === membership._id),
    ),
  ];
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
  requiredRole?: Role,
) {
  const user = await requireUser(ctx);

  const membership = await findTeamMembership(ctx, teamId, user);

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
  requiredRole?: Role,
) {
  const user = await requireUser(ctx);

  const project = await ctx.db.get(projectId);
  if (!project) {
    throw new Error("Project not found");
  }

  const membership = await findTeamMembership(ctx, project.teamId, user);

  if (!membership) {
    throw new Error("Not a team member");
  }

  if (requiredRole && ROLE_HIERARCHY[membership.role] < ROLE_HIERARCHY[requiredRole]) {
    throw new Error(`Requires ${requiredRole} role or higher`);
  }

  return { user, membership, project };
}

export async function requireVideoAccess(
  ctx: QueryCtx | MutationCtx,
  videoId: Id<"videos">,
  requiredRole?: Role,
) {
  const user = await requireUser(ctx);

  const video = await ctx.db.get(videoId);
  if (!video) {
    throw new Error("Video not found");
  }

  const project = await ctx.db.get(video.projectId);
  if (!project) {
    throw new Error("Project not found");
  }

  const membership = await findTeamMembership(ctx, project.teamId, user);

  if (!membership) {
    throw new Error("Not a team member");
  }

  if (requiredRole && ROLE_HIERARCHY[membership.role] < ROLE_HIERARCHY[requiredRole]) {
    throw new Error(`Requires ${requiredRole} role or higher`);
  }

  return { user, membership, project, video };
}
