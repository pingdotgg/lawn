import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser, requireTeamAccess, getUser } from "./auth";
import { Id } from "./_generated/dataModel";

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 50);
}

function generateToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
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
      ownerId: user._id,
      plan: "free",
    });

    await ctx.db.insert("teamMembers", {
      teamId,
      userId: user._id,
      role: "owner",
    });

    return teamId;
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getUser(ctx);
    if (!user) return [];

    const memberships = await ctx.db
      .query("teamMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const teams = await Promise.all(
      memberships.map(async (m) => {
        const team = await ctx.db.get(m.teamId);
        return team ? { ...team, role: m.role } : null;
      })
    );

    return teams.filter(Boolean);
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const team = await ctx.db
      .query("teams")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (!team) return null;

    const user = await getUser(ctx);
    if (!user) return null;

    const membership = await ctx.db
      .query("teamMembers")
      .withIndex("by_team_and_user", (q) =>
        q.eq("teamId", team._id).eq("userId", user._id)
      )
      .unique();

    if (!membership) return null;

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

    const members = await Promise.all(
      memberships.map(async (m) => {
        const user = await ctx.db.get(m.userId);
        return user ? { ...user, role: m.role, membershipId: m._id } : null;
      })
    );

    return members.filter(Boolean);
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

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (existingUser) {
      const existingMembership = await ctx.db
        .query("teamMembers")
        .withIndex("by_team_and_user", (q) =>
          q.eq("teamId", args.teamId).eq("userId", existingUser._id)
        )
        .unique();

      if (existingMembership) {
        throw new Error("User is already a member of this team");
      }
    }

    const existingInvite = await ctx.db
      .query("teamInvites")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .filter((q) => q.eq(q.field("teamId"), args.teamId))
      .unique();

    if (existingInvite) {
      await ctx.db.delete(existingInvite._id);
    }

    const token = generateToken();
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

    await ctx.db.insert("teamInvites", {
      teamId: args.teamId,
      email: args.email,
      role: args.role,
      invitedBy: user._id,
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

    if (invite.email !== user.email) {
      throw new Error("Invite is for a different email address");
    }

    const existingMembership = await ctx.db
      .query("teamMembers")
      .withIndex("by_team_and_user", (q) =>
        q.eq("teamId", invite.teamId).eq("userId", user._id)
      )
      .unique();

    if (existingMembership) {
      throw new Error("You are already a member of this team");
    }

    await ctx.db.insert("teamMembers", {
      teamId: invite.teamId,
      userId: user._id,
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
    const invitedByUser = await ctx.db.get(invite.invitedBy);

    return {
      team: team ? { name: team.name, slug: team.slug } : null,
      invitedBy: invitedByUser?.name,
      email: invite.email,
      role: invite.role,
    };
  },
});

export const removeMember = mutation({
  args: {
    teamId: v.id("teams"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { user } = await requireTeamAccess(ctx, args.teamId, "admin");

    const team = await ctx.db.get(args.teamId);
    if (team?.ownerId === args.userId) {
      throw new Error("Cannot remove the team owner");
    }

    if (args.userId === user._id) {
      throw new Error("Cannot remove yourself. Use leave instead.");
    }

    const membership = await ctx.db
      .query("teamMembers")
      .withIndex("by_team_and_user", (q) =>
        q.eq("teamId", args.teamId).eq("userId", args.userId)
      )
      .unique();

    if (!membership) {
      throw new Error("User is not a member of this team");
    }

    await ctx.db.delete(membership._id);
  },
});

export const updateMemberRole = mutation({
  args: {
    teamId: v.id("teams"),
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("member"), v.literal("viewer")),
  },
  handler: async (ctx, args) => {
    await requireTeamAccess(ctx, args.teamId, "admin");

    const team = await ctx.db.get(args.teamId);
    if (team?.ownerId === args.userId) {
      throw new Error("Cannot change the team owner's role");
    }

    const membership = await ctx.db
      .query("teamMembers")
      .withIndex("by_team_and_user", (q) =>
        q.eq("teamId", args.teamId).eq("userId", args.userId)
      )
      .unique();

    if (!membership) {
      throw new Error("User is not a member of this team");
    }

    await ctx.db.patch(membership._id, { role: args.role });
  },
});

export const leave = mutation({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    const { user, membership } = await requireTeamAccess(ctx, args.teamId);

    const team = await ctx.db.get(args.teamId);
    if (team?.ownerId === user._id) {
      throw new Error("Team owner cannot leave. Transfer ownership first.");
    }

    await ctx.db.delete(membership._id);
  },
});

export const deleteTeam = mutation({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    await requireTeamAccess(ctx, args.teamId, "owner");

    // Delete all team members
    const members = await ctx.db
      .query("teamMembers")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();
    for (const member of members) {
      await ctx.db.delete(member._id);
    }

    // Delete all invites
    const invites = await ctx.db
      .query("teamInvites")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();
    for (const invite of invites) {
      await ctx.db.delete(invite._id);
    }

    // Delete all projects and their videos/comments
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();

    for (const project of projects) {
      const videos = await ctx.db
        .query("videos")
        .withIndex("by_project", (q) => q.eq("projectId", project._id))
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

      await ctx.db.delete(project._id);
    }

    await ctx.db.delete(args.teamId);
  },
});
