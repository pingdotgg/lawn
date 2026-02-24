import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { getUser, identityAvatarUrl, identityEmail, identityName, requireUser, requireAllowedUser, requireTeamAccess } from "./auth";
import { getTeamSubscriptionState } from "./billingHelpers";

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
    const user = await requireAllowedUser(ctx);

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
      plan: "basic",
      billingStatus: "not_subscribed",
    });

    await ctx.db.insert("teamMembers", {
      teamId,
      userClerkId: user.subject,
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

    const memberships = await ctx.db
      .query("teamMembers")
      .withIndex("by_user", (q) => q.eq("userClerkId", user.subject))
      .collect();

    const teams = await Promise.all(
      memberships.map(async (membership) => {
        const team = await ctx.db.get(membership.teamId);
        return team ? { ...team, role: membership.role } : null;
      })
    );

    return teams.filter((t): t is NonNullable<typeof t> => Boolean(t));
  },
});

export const listWithProjects = query({
  args: {},
  handler: async (ctx) => {
    const user = await getUser(ctx);
    if (!user) return [];

    const memberships = await ctx.db
      .query("teamMembers")
      .withIndex("by_user", (q) => q.eq("userClerkId", user.subject))
      .collect();

    const teams = await Promise.all(
      memberships.map(async (membership) => {
        const team = await ctx.db.get(membership.teamId);
        if (!team) return null;
        
        const projects = await ctx.db
          .query("projects")
          .withIndex("by_team", (q) => q.eq("teamId", team._id))
          .collect();

        // Get video counts for each project
        const projectsWithCounts = await Promise.all(
          projects.map(async (project) => {
            const videos = await ctx.db
              .query("videos")
              .withIndex("by_project", (q) => q.eq("projectId", project._id))
              .collect();
            return {
              ...project,
              videoCount: videos.length,
            };
          })
        );
          
        return { ...team, role: membership.role, projects: projectsWithCounts };
      })
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
        q.eq("teamId", args.teamId).eq("userEmail", inviteEmail)
      )
      .unique();

    if (existingMembership) {
      throw new Error("User is already a member of this team");
    }

    const existingInvite = await ctx.db
      .query("teamInvites")
      .withIndex("by_email", (q) => q.eq("email", inviteEmail))
      .filter((q) => q.eq(q.field("teamId"), args.teamId))
      .unique();

    if (existingInvite) {
      await ctx.db.delete(existingInvite._id);
    }

    const token = generateToken();
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

    await ctx.db.insert("teamInvites", {
      teamId: args.teamId,
      email: inviteEmail,
      role: args.role,
      invitedByClerkId: user.subject,
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

    const existingMembership = await ctx.db
      .query("teamMembers")
      .withIndex("by_team_and_user", (q) =>
        q.eq("teamId", invite.teamId).eq("userClerkId", user.subject)
      )
      .unique();

    if (existingMembership) {
      throw new Error("You are already a member of this team");
    }

    await ctx.db.insert("teamMembers", {
      teamId: invite.teamId,
      userClerkId: user.subject,
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

    const team = await ctx.db.get(args.teamId);
    const membership = await ctx.db.get(args.membershipId);

    if (!team || !membership) {
      throw new Error("User is not a member of this team");
    }

    if (membership.teamId !== team._id) {
      throw new Error("User is not a member of this team");
    }

    if (team.ownerClerkId === membership.userClerkId) {
      throw new Error("Cannot remove the team owner");
    }

    if (membership.userClerkId === user.subject) {
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

    const team = await ctx.db.get(args.teamId);
    const membership = await ctx.db.get(args.membershipId);

    if (!team || !membership || membership.teamId !== team._id) {
      throw new Error("User is not a member of this team");
    }

    if (team.ownerClerkId === membership.userClerkId) {
      throw new Error("Cannot change the team owner's role");
    }

    await ctx.db.patch(membership._id, { role: args.role });
  },
});

export const leave = mutation({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    const { user, membership } = await requireTeamAccess(ctx, args.teamId);

    const team = await ctx.db.get(args.teamId);
    if (!team) return;

    if (team.ownerClerkId === user.subject) {
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

      await ctx.db.delete(project._id);
    }

    await ctx.db.delete(args.teamId);
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
