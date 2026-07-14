import { Presence } from "@convex-dev/presence";
import { ConvexError, v } from "convex/values";
import { components } from "./_generated/api";
import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import {
  identityAvatarUrl,
  identityName,
  requireProjectAccess,
  requireVideoAccess,
} from "./auth";
import { findShareLinkByToken } from "./shareAccess";

const presence = new Presence(components.presence);
const DEFAULT_HEARTBEAT_INTERVAL_MS = 15_000;

const playbackValidator = v.object({
  currentTime: v.number(),
  paused: v.boolean(),
  updatedAt: v.number(),
});

const watcherDataValidator = v.object({
  kind: v.union(v.literal("member"), v.literal("guest")),
  displayName: v.string(),
  avatarUrl: v.optional(v.string()),
  leading: v.optional(v.boolean()),
  playback: v.optional(playbackValidator),
});

type WatcherData = {
  kind: "member" | "guest";
  displayName: string;
  avatarUrl?: string;
  leading?: boolean;
  playback?: {
    currentTime: number;
    paused: boolean;
    updatedAt: number;
  };
};

function roomIdForVideo(videoId: string) {
  return `video:${videoId}`;
}

function guestDisplayName(clientId: string) {
  const suffix = clientId
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 4)
    .toUpperCase();
  return `Guest ${suffix || "USER"}`;
}

function clampPlayback(playback: {
  currentTime: number;
  paused: boolean;
  updatedAt: number;
}) {
  return {
    currentTime: Math.max(0, playback.currentTime),
    paused: playback.paused,
    // Reject absurd future timestamps; keep a small skew allowance.
    updatedAt: Math.min(playback.updatedAt, Date.now() + 5_000),
  };
}

async function hasShareTokenAccess(
  ctx: MutationCtx | QueryCtx,
  shareToken: string | undefined,
  videoId: string,
) {
  if (!shareToken) return false;

  const shareLink = await findShareLinkByToken(ctx, shareToken);
  if (!shareLink) return false;
  if (shareLink.expiresAt && shareLink.expiresAt <= Date.now()) return false;

  return shareLink.videoId === videoId;
}

async function assertVideoRoomAccess(
  ctx: MutationCtx,
  videoId: Id<"videos">,
  shareToken: string | undefined,
) {
  const identity = await ctx.auth.getUserIdentity();

  let hasVideoAccess = false;
  if (identity) {
    try {
      await requireVideoAccess(ctx, videoId, "viewer");
      hasVideoAccess = true;
    } catch {
      hasVideoAccess = false;
    }
  }

  // Only check share-token access when video membership didn't already grant
  // access. This avoids a by_token index read on every authenticated
  // heartbeat (the hottest path in the app).
  if (!hasVideoAccess) {
    const hasTokenAccess = await hasShareTokenAccess(ctx, shareToken, videoId);
    if (!hasTokenAccess) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "You do not have access to this video.",
      });
    }
  }

  return identity;
}

async function resolvePresenceIdentity(
  ctx: MutationCtx,
  videoId: Id<"videos">,
  clientId: string,
  shareToken: string | undefined,
) {
  const identity = await assertVideoRoomAccess(ctx, videoId, shareToken);

  if (identity) {
    return {
      userId: `clerk:${identity.subject}`,
      kind: "member" as const,
      displayName: identityName(identity),
      avatarUrl: identityAvatarUrl(identity),
      clerkSubject: identity.subject,
    };
  }

  const trimmedClientId = clientId.trim();
  if (!trimmedClientId) {
    throw new ConvexError({
      code: "BAD_REQUEST",
      message: "Missing client identifier.",
    });
  }

  return {
    userId: `guest:${trimmedClientId}`,
    kind: "guest" as const,
    displayName: guestDisplayName(trimmedClientId),
    avatarUrl: undefined as string | undefined,
    clerkSubject: null as string | null,
  };
}

async function getVideoLeader(ctx: QueryCtx | MutationCtx, videoId: Id<"videos">) {
  return await ctx.db
    .query("videoLeaders")
    .withIndex("by_video", (q) => q.eq("videoId", videoId))
    .unique();
}

function buildWatcherData(input: {
  kind: "member" | "guest";
  displayName: string;
  avatarUrl?: string;
  userId: string;
  leaderUserId?: string | null;
  playback?: {
    currentTime: number;
    paused: boolean;
    updatedAt: number;
  };
}): WatcherData {
  const data: WatcherData = {
    kind: input.kind,
    displayName: input.displayName,
  };

  if (input.avatarUrl) {
    data.avatarUrl = input.avatarUrl;
  }

  if (input.leaderUserId && input.leaderUserId === input.userId) {
    data.leading = true;
  }

  if (input.playback) {
    data.playback = clampPlayback(input.playback);
  }

  return data;
}

function parseWatcherData(raw: unknown, userId: string): WatcherData {
  if (
    raw &&
    typeof raw === "object" &&
    ("kind" in raw || "displayName" in raw) &&
    (raw as { kind?: string }).kind &&
    (raw as { displayName?: string }).displayName
  ) {
    const candidate = raw as {
      kind: "member" | "guest";
      displayName: string;
      avatarUrl?: string;
      leading?: boolean;
      playback?: {
        currentTime: number;
        paused: boolean;
        updatedAt: number;
      };
    };

    const data: WatcherData = {
      kind: candidate.kind === "guest" ? "guest" : "member",
      displayName: candidate.displayName,
    };

    if (candidate.avatarUrl) {
      data.avatarUrl = candidate.avatarUrl;
    }
    if (candidate.leading) {
      data.leading = true;
    }
    if (
      candidate.playback &&
      typeof candidate.playback.currentTime === "number" &&
      typeof candidate.playback.paused === "boolean" &&
      typeof candidate.playback.updatedAt === "number"
    ) {
      data.playback = clampPlayback(candidate.playback);
    }

    return data;
  }

  if (userId.startsWith("guest:")) {
    const clientId = userId.slice("guest:".length);
    return {
      kind: "guest",
      displayName: guestDisplayName(clientId),
    };
  }

  return {
    kind: "member",
    displayName: "Member",
  };
}

export const heartbeat = mutation({
  args: {
    videoId: v.id("videos"),
    sessionId: v.string(),
    clientId: v.string(),
    interval: v.optional(v.number()),
    shareToken: v.optional(v.string()),
    // Optional: keep playback on the identity refresh path so heartbeats
    // don't wipe a more recent playback publish.
    playback: v.optional(playbackValidator),
  },
  returns: v.object({
    roomToken: v.string(),
    sessionToken: v.string(),
    userId: v.string(),
  }),
  handler: async (ctx, args) => {
    const identity = await resolvePresenceIdentity(
      ctx,
      args.videoId,
      args.clientId,
      args.shareToken,
    );

    const roomId = roomIdForVideo(args.videoId);
    const leader = await getVideoLeader(ctx, args.videoId);

    const result = await presence.heartbeat(
      ctx,
      roomId,
      identity.userId,
      args.sessionId,
      args.interval ?? DEFAULT_HEARTBEAT_INTERVAL_MS,
    );

    await presence.updateRoomUser(
      ctx,
      roomId,
      identity.userId,
      buildWatcherData({
        kind: identity.kind,
        displayName: identity.displayName,
        avatarUrl: identity.avatarUrl,
        userId: identity.userId,
        leaderUserId: leader?.leaderUserId,
        playback: args.playback,
      }),
    );

    return {
      ...result,
      userId: identity.userId,
    };
  },
});

/**
 * Publish playhead / play-pause state for the current user.
 * Intended to be throttled on the client (~250–500ms while playing;
 * immediate on pause / seek / play).
 */
export const updatePlayback = mutation({
  args: {
    videoId: v.id("videos"),
    clientId: v.string(),
    shareToken: v.optional(v.string()),
    playback: playbackValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await resolvePresenceIdentity(
      ctx,
      args.videoId,
      args.clientId,
      args.shareToken,
    );

    const roomId = roomIdForVideo(args.videoId);
    const leader = await getVideoLeader(ctx, args.videoId);

    await presence.updateRoomUser(
      ctx,
      roomId,
      identity.userId,
      buildWatcherData({
        kind: identity.kind,
        displayName: identity.displayName,
        avatarUrl: identity.avatarUrl,
        userId: identity.userId,
        leaderUserId: leader?.leaderUserId,
        playback: args.playback,
      }),
    );

    return null;
  },
});

/**
 * Project members (member+) can claim lead. Last claim wins.
 * Guests and viewers cannot lead.
 */
export const claimLead = mutation({
  args: {
    videoId: v.id("videos"),
    playback: v.optional(playbackValidator),
  },
  returns: v.object({
    leaderUserId: v.string(),
    displayName: v.string(),
  }),
  handler: async (ctx, args) => {
    // Only authenticated team members with member+ may lead.
    const { user } = await requireVideoAccess(ctx, args.videoId, "member");
    const userId = `clerk:${user.subject}`;
    const displayName = identityName(user);
    const avatarUrl = identityAvatarUrl(user);
    const roomId = roomIdForVideo(args.videoId);
    const now = Date.now();

    const existing = await getVideoLeader(ctx, args.videoId);
    if (existing) {
      if (existing.leaderUserId !== userId) {
        // Clear leading flag on the previous leader's presence payload when possible.
        await presence.updateRoomUser(ctx, roomId, existing.leaderUserId, {
          kind: "member",
          displayName: existing.displayName,
          leading: false,
        });
      }
      await ctx.db.patch(existing._id, {
        leaderUserId: userId,
        displayName,
        claimedAt: now,
      });
    } else {
      await ctx.db.insert("videoLeaders", {
        videoId: args.videoId,
        leaderUserId: userId,
        displayName,
        claimedAt: now,
      });
    }

    // Ensure the claimer is in the room with leading + optional playback.
    // Room join is separate (heartbeat); update is a no-op if not present yet.
    await presence.updateRoomUser(
      ctx,
      roomId,
      userId,
      buildWatcherData({
        kind: "member",
        displayName,
        avatarUrl,
        userId,
        leaderUserId: userId,
        playback: args.playback,
      }),
    );

    return { leaderUserId: userId, displayName };
  },
});

export const releaseLead = mutation({
  args: {
    videoId: v.id("videos"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user } = await requireVideoAccess(ctx, args.videoId, "member");
    const userId = `clerk:${user.subject}`;
    const existing = await getVideoLeader(ctx, args.videoId);
    if (!existing) return null;

    // Only the current leader (or an admin+) may release.
    if (existing.leaderUserId !== userId) {
      await requireVideoAccess(ctx, args.videoId, "admin");
    }

    await ctx.db.delete(existing._id);

    const roomId = roomIdForVideo(args.videoId);
    await presence.updateRoomUser(ctx, roomId, existing.leaderUserId, {
      kind: "member",
      displayName: existing.displayName,
      leading: false,
    });

    return null;
  },
});

export const canLead = query({
  args: {
    videoId: v.id("videos"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    try {
      await requireVideoAccess(ctx, args.videoId, "member");
      return true;
    } catch {
      return false;
    }
  },
});

export const getLeader = query({
  args: {
    videoId: v.id("videos"),
    shareToken: v.optional(v.string()),
  },
  returns: v.union(
    v.null(),
    v.object({
      leaderUserId: v.string(),
      displayName: v.string(),
      claimedAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    let hasAccess = false;

    if (identity) {
      try {
        await requireVideoAccess(ctx, args.videoId, "viewer");
        hasAccess = true;
      } catch {
        hasAccess = false;
      }
    }

    if (!hasAccess) {
      const hasTokenAccess = await hasShareTokenAccess(ctx, args.shareToken, args.videoId);
      if (!hasTokenAccess) {
        return null;
      }
    }

    const leader = await getVideoLeader(ctx, args.videoId);
    if (!leader) return null;

    return {
      leaderUserId: leader.leaderUserId,
      displayName: leader.displayName,
      claimedAt: leader.claimedAt,
    };
  },
});

export const list = query({
  args: {
    roomToken: v.string(),
  },
  returns: v.array(
    v.object({
      userId: v.string(),
      online: v.boolean(),
      lastDisconnected: v.number(),
      data: v.optional(watcherDataValidator),
    }),
  ),
  handler: async (ctx, args) => {
    const state = await presence.list(ctx, args.roomToken);

    return state.map((entry) => ({
      userId: entry.userId,
      online: entry.online,
      lastDisconnected: entry.lastDisconnected,
      data: parseWatcherData(entry.data, entry.userId),
    }));
  },
});

export const disconnect = mutation({
  args: {
    sessionToken: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await presence.disconnect(ctx, args.sessionToken);
    return null;
  },
});

export const listProjectOnlineCounts = query({
  args: {
    projectId: v.id("projects"),
  },
  returns: v.object({
    counts: v.record(v.string(), v.number()),
  }),
  handler: async (ctx, args) => {
    await requireProjectAccess(ctx, args.projectId, "viewer");

    const videos = await ctx.db
      .query("videos")
      .withIndex("by_project_and_superseded_by_video_id", (q) =>
        q.eq("projectId", args.projectId).eq("supersededByVideoId", undefined),
      )
      .collect();

    const counts: Record<string, number> = {};

    await Promise.all(
      videos.map(async (video) => {
        const onlineUsers = await presence.listRoom(ctx, roomIdForVideo(video._id), true);
        counts[video._id] = onlineUsers.length;
      }),
    );

    return { counts };
  },
});
