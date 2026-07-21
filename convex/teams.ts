import { v } from "convex/values";
import { internalMutation, mutation, query, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import {
  getUser,
  findTeamMembership,
  identityAvatarUrl,
  identityEmail,
  identityKey,
  identityMatches,
  identityName,
  listMembershipsForIdentity,
  requireUser,
  requireTeamAccess,
} from "./auth";
import { getTeamSubscriptionState } from "./billingHelpers";
import { deleteProjectSubtreeBatch } from "./projects";
import { generateUniqueToken } from "./security";

function normalizedEmail(value: string) {
  return value.trim().toLowerCase();
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 50);
}

async function generateInviteToken(ctx: MutationCtx) {
  return await generateUniqueToken(
    32,
    async (candidate) =>
      (await ctx.db
        .query("teamInvites")
        .withIndex("by_token", (q) => q.eq("token", candidate))
        .unique()) !== null,
  );
}

export const create = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    let slug = generateSlug(args.name);
    let existingWithSlug = await ctx.db
      .query("teams")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();

    let counter = 1;
    while (existingWithSlug) {
      slug = `${generateSlug(args.name)}-${counter}`;
      existingWithSlug = await ctx.db
        .query("teams")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .unique();
      counter++;
    }

    const teamId = await ctx.db.insert("teams", {
      name: args.name,
      slug,
      ownerClerkId: user.subject,
      ownerIdentity: identityKey(user),
      plan: "basic",
      billingStatus: "not_subscribed",
    });

    await ctx.db.insert("teamMembers", {
      teamId,
      userClerkId: user.subject,
      userIdentity: identityKey(user),
      userEmail: normalizedEmail(identityEmail(user)),
      userName: identityName(user),
      userAvatarUrl: identityAvatarUrl(user),
      role: "owner",
    });

    return {
      teamId,
      slug,
    };
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getUser(ctx);
    if (!user) return [];

    const memberships = await listMembershipsForIdentity(ctx, user);

    const teams = await Promise.all(
      memberships.map(async (membership) => {
        const team = await ctx.db.get(membership.teamId);
        return team ? { ...team, role: membership.role } : null;
      }),
    );

    return teams.filter((t): t is NonNullable<typeof t> => Boolean(t));
  },
});

export const listWithProjects = query({
  args: {},
  handler: async (ctx) => {
    const user = await getUser(ctx);
    if (!user) return [];

    const memberships = await listMembershipsForIdentity(ctx, user);

    const teams = await Promise.all(
      memberships.map(async (membership) => {
        const team = await ctx.db.get(membership.teamId);
        if (!team) return null;

        // Only root folders show on the dashboard home; nested folders are
        // reached by drilling into their parent.
        const projects = await ctx.db
          .query("projects")
          .withIndex("by_team_and_parent", (q) =>
            q.eq("teamId", team._id).eq("parentId", undefined),
          )
          .collect();

        // Get video + subfolder counts for each root folder. Counts are capped
        // at 100 via .take(101) so a folder with thousands of items doesn't
        // materialize them all just to read .length.
        const projectsWithCounts = await Promise.all(
          projects.map(async (project) => {
            const videoPage = await ctx.db
              .query("videos")
              .withIndex("by_project_and_superseded_by_video_id", (q) =>
                q.eq("projectId", project._id).eq("supersededByVideoId", undefined),
              )
              .order("desc")
              .take(101);
            const subfolderPage = await ctx.db
              .query("projects")
              .withIndex("by_team_and_parent", (q) =>
                q.eq("teamId", team._id).eq("parentId", project._id),
              )
              .take(101);
            return {
              ...project,
              videoCount: videoPage.length === 101 ? 100 : videoPage.length,
              lastUploadedAt: videoPage[0]?._creationTime,
              subfolderCount: subfolderPage.length === 101 ? 100 : subfolderPage.length,
              videoCountIsCapped: videoPage.length === 101,
              subfolderCountIsCapped: subfolderPage.length === 101,
            };
          }),
        );

        return { ...team, role: membership.role, projects: projectsWithCounts };
      }),
    );

    return teams.filter((t): t is NonNullable<typeof t> => Boolean(t));
  },
});

export const get = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    const { membership } = await requireTeamAccess(ctx, args.teamId);
    const team = await ctx.db.get(args.teamId);
    if (!team) return null;
    return { ...team, role: membership.role };
  },
});

export const getMembers = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    await requireTeamAccess(ctx, args.teamId);

    const memberships = await ctx.db
      .query("teamMembers")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();

    return memberships.map((membership) => ({
      ...membership,
      _id: membership._id,
      membershipId: membership._id,
    }));
  },
});

export const update = mutation({
  args: {
    teamId: v.id("teams"),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireTeamAccess(ctx, args.teamId, "admin");

    const updates: Partial<{ name: string }> = {};
    if (args.name) updates.name = args.name;

    await ctx.db.patch(args.teamId, updates);
  },
});

export const inviteMember = mutation({
  args: {
    teamId: v.id("teams"),
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("member"), v.literal("viewer")),
  },
  handler: async (ctx, args) => {
    const { user } = await requireTeamAccess(ctx, args.teamId, "admin");

    const inviteEmail = normalizedEmail(args.email);

    const existingMembership = await ctx.db
      .query("teamMembers")
      .withIndex("by_team_and_email", (q) =>
        q.eq("teamId", args.teamId).eq("userEmail", inviteEmail),
      )
      .unique();

    if (existingMembership) {
      throw new Error("User is already a member of this team");
    }

    const existingInvite = await ctx.db
      .query("teamInvites")
      .withIndex("by_team_and_email", (q) => q.eq("teamId", args.teamId).eq("email", inviteEmail))
      .unique();

    if (existingInvite) {
      await ctx.db.delete(existingInvite._id);
    }

    const token = await generateInviteToken(ctx);
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

    await ctx.db.insert("teamInvites", {
      teamId: args.teamId,
      email: inviteEmail,
      role: args.role,
      invitedByClerkId: user.subject,
      invitedByIdentity: identityKey(user),
      invitedByName: identityName(user),
      token,
      expiresAt,
    });

    return token;
  },
});

export const getInvites = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    await requireTeamAccess(ctx, args.teamId, "admin");

    const invites = await ctx.db
      .query("teamInvites")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();

    return invites.filter((i) => i.expiresAt > Date.now());
  },
});

export const acceptInvite = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const invite = await ctx.db
      .query("teamInvites")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    if (!invite) {
      throw new Error("Invalid invite");
    }

    if (invite.expiresAt < Date.now()) {
      throw new Error("Invite has expired");
    }

    if (invite.email !== normalizedEmail(identityEmail(user))) {
      throw new Error("Invite is for a different email address");
    }

    const existingMembership = await findTeamMembership(ctx, invite.teamId, user);

    if (existingMembership) {
      throw new Error("You are already a member of this team");
    }

    await ctx.db.insert("teamMembers", {
      teamId: invite.teamId,
      userClerkId: user.subject,
      userIdentity: identityKey(user),
      userEmail: normalizedEmail(identityEmail(user)),
      userName: identityName(user),
      userAvatarUrl: identityAvatarUrl(user),
      role: invite.role,
    });

    await ctx.db.delete(invite._id);

    const team = await ctx.db.get(invite.teamId);
    return team;
  },
});

export const getInviteByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const invite = await ctx.db
      .query("teamInvites")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    if (!invite || invite.expiresAt < Date.now()) {
      return null;
    }

    const team = await ctx.db.get(invite.teamId);

    return {
      team: team ? { name: team.name, slug: team.slug } : null,
      invitedBy: invite.invitedByName,
      email: invite.email,
      role: invite.role,
    };
  },
});

export const removeMember = mutation({
  args: {
    teamId: v.id("teams"),
    membershipId: v.id("teamMembers"),
  },
  handler: async (ctx, args) => {
    const { user } = await requireTeamAccess(ctx, args.teamId, "admin");

    const [team, membership] = await Promise.all([
      ctx.db.get(args.teamId),
      ctx.db.get(args.membershipId),
    ]);

    if (!team || !membership) {
      throw new Error("User is not a member of this team");
    }

    if (membership.teamId !== team._id) {
      throw new Error("User is not a member of this team");
    }

    if (membership.role === "owner") {
      throw new Error("Cannot remove the team owner");
    }

    if (identityMatches(user, membership.userIdentity, membership.userClerkId)) {
      throw new Error("Cannot remove yourself. Use leave instead.");
    }

    await ctx.db.delete(membership._id);
  },
});

export const updateMemberRole = mutation({
  args: {
    teamId: v.id("teams"),
    membershipId: v.id("teamMembers"),
    role: v.union(v.literal("admin"), v.literal("member"), v.literal("viewer")),
  },
  handler: async (ctx, args) => {
    await requireTeamAccess(ctx, args.teamId, "admin");

    const [team, membership] = await Promise.all([
      ctx.db.get(args.teamId),
      ctx.db.get(args.membershipId),
    ]);

    if (!team || !membership || membership.teamId !== team._id) {
      throw new Error("User is not a member of this team");
    }

    if (membership.role === "owner") {
      throw new Error("Cannot change the team owner's role");
    }

    await ctx.db.patch(membership._id, { role: args.role });
  },
});

export const leave = mutation({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    const { membership } = await requireTeamAccess(ctx, args.teamId);

    if (membership.role === "owner") {
      throw new Error("Team owner cannot leave. Transfer ownership first.");
    }

    await ctx.db.delete(membership._id);
  },
});

export const deleteTeam = mutation({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    await requireTeamAccess(ctx, args.teamId, "owner");
    const subscriptionState = await getTeamSubscriptionState(ctx, args.teamId);
    if (subscriptionState.hasActiveSubscription) {
      throw new Error(
        "Cannot delete a team with an active subscription. Cancel billing first in team settings.",
      );
    }

    const result = await deleteTeamBatch(ctx, args.teamId);
    if (!result.done) {
      await ctx.scheduler.runAfter(0, internal.teams.continueTeamDelete, {
        teamId: args.teamId,
      });
    }
  },
});

const TEAM_DELETE_BATCH_SIZE = 500;

async function deleteTeamBatch(ctx: MutationCtx, teamId: Id<"teams">) {
  const team = await ctx.db.get(teamId);
  if (!team) return { done: true };

  const project = await ctx.db
    .query("projects")
    .withIndex("by_team", (q) => q.eq("teamId", teamId))
    .first();
  if (project) {
    await deleteProjectSubtreeBatch(ctx, teamId, project._id);
    return { done: false };
  }

  let remaining = TEAM_DELETE_BATCH_SIZE;
  const invites = await ctx.db
    .query("teamInvites")
    .withIndex("by_team", (q) => q.eq("teamId", teamId))
    .take(remaining);
  for (const invite of invites) await ctx.db.delete(invite._id);
  remaining -= invites.length;
  if (remaining === 0) return { done: false };

  const members = await ctx.db
    .query("teamMembers")
    .withIndex("by_team", (q) => q.eq("teamId", teamId))
    .take(remaining);
  for (const member of members) await ctx.db.delete(member._id);
  remaining -= members.length;
  if (remaining === 0) return { done: false };

  await ctx.db.delete(teamId);
  return { done: true };
}

export const continueTeamDelete = internalMutation({
  args: { teamId: v.id("teams") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const result = await deleteTeamBatch(ctx, args.teamId);
    if (!result.done) {
      await ctx.scheduler.runAfter(0, internal.teams.continueTeamDelete, args);
    }
    return null;
  },
});

export const linkStripeCustomer = internalMutation({
  args: {
    teamId: v.id("teams"),
    stripeCustomerId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.teamId, {
      stripeCustomerId: args.stripeCustomerId,
    });
    return null;
  },
});
