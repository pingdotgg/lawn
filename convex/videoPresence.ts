import { Presence } from "@convex-dev/presence";
import { ConvexError, v } from "convex/values";
import { components } from "./_generated/api";
import { mutation, query, MutationCtx } from "./_generated/server";
import { identityAvatarUrl, identityName, requireProjectAccess, requireVideoAccess } from "./auth";
import { findShareLinkByToken } from "./shareAccess";

const presence = new Presence(components.presence);
const DEFAULT_HEARTBEAT_INTERVAL_MS = 15_000;
const MAX_PROJECT_PRESENCE_VIDEOS = 40;

const watcherDataValidator = v.object({
  kind: v.union(v.literal("member"), v.literal("guest")),
  displayName: v.string(),
  avatarUrl: v.optional(v.string()),
});

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

async function hasShareTokenAccess(
  ctx: MutationCtx,
  shareToken: string | undefined,
  videoId: string,
) {
  if (!shareToken) return false;

  const shareLink = await findShareLinkByToken(ctx, shareToken);
  if (!shareLink) return false;
  if (shareLink.expiresAt && shareLink.expiresAt <= Date.now()) return false;

  return shareLink.videoId === videoId;
}

export const heartbeat = mutation({
  args: {
    videoId: v.id("videos"),
    sessionId: v.string(),
    clientId: v.string(),
    interval: v.optional(v.number()),
    shareToken: v.optional(v.string()),
  },
  returns: v.object({
    roomToken: v.string(),
    sessionToken: v.string(),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    let hasVideoAccess = false;
    if (identity) {
      try {
        await requireVideoAccess(ctx, args.videoId, "viewer");
        hasVideoAccess = true;
      } catch {
        hasVideoAccess = false;
      }
    }

    // Only check share-token access when video membership didn't already grant
    // access. This avoids a by_token index read on every authenticated
    // heartbeat (the hottest path in the app).
    if (!hasVideoAccess) {
      const hasTokenAccess = await hasShareTokenAccess(ctx, args.shareToken, args.videoId);
      if (!hasTokenAccess) {
        throw new ConvexError({
          code: "UNAUTHORIZED",
          message: "You do not have access to this video.",
        });
      }
    }

    const roomId = roomIdForVideo(args.videoId);
    let userId: string;
    let data: {
      kind: "member" | "guest";
      displayName: string;
      avatarUrl?: string;
    };

    if (identity) {
      userId = `clerk:${identity.subject}`;
      data = {
        kind: "member",
        displayName: identityName(identity),
        avatarUrl: identityAvatarUrl(identity),
      };
    } else {
      const clientId = args.clientId.trim();
      if (!clientId) {
        throw new ConvexError({
          code: "BAD_REQUEST",
          message: "Missing client identifier.",
        });
      }

      userId = `guest:${clientId}`;
      data = {
        kind: "guest",
        displayName: guestDisplayName(clientId),
      };
    }

    const result = await presence.heartbeat(
      ctx,
      roomId,
      userId,
      args.sessionId,
      args.interval ?? DEFAULT_HEARTBEAT_INTERVAL_MS,
    );
    await presence.updateRoomUser(ctx, roomId, userId, data);
    return result;
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

    return state.map((entry) => {
      const raw = entry.data;
      const parsed =
        raw &&
        typeof raw === "object" &&
        ("kind" in raw || "displayName" in raw) &&
        (raw as { kind?: string }).kind &&
        (raw as { displayName?: string }).displayName
          ? (raw as {
              kind: "member" | "guest";
              displayName: string;
              avatarUrl?: string;
            })
          : undefined;

      if (parsed) {
        return {
          userId: entry.userId,
          online: entry.online,
          lastDisconnected: entry.lastDisconnected,
          data: parsed,
        };
      }

      if (entry.userId.startsWith("guest:")) {
        const clientId = entry.userId.slice("guest:".length);
        return {
          userId: entry.userId,
          online: entry.online,
          lastDisconnected: entry.lastDisconnected,
          data: {
            kind: "guest" as const,
            displayName: guestDisplayName(clientId),
          },
        };
      }

      return {
        userId: entry.userId,
        online: entry.online,
        lastDisconnected: entry.lastDisconnected,
        data: {
          kind: "member" as const,
          displayName: "Member",
        },
      };
    });
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
    // Optional so clients loaded before this argument existed keep a live
    // (empty) subscription instead of crashing on argument validation.
    videoIds: v.optional(v.array(v.id("videos"))),
  },
  returns: v.object({
    counts: v.record(v.string(), v.number()),
  }),
  handler: async (ctx, args) => {
    await requireProjectAccess(ctx, args.projectId, "viewer");

    const requestedVideoIds = args.videoIds ?? [];
    if (requestedVideoIds.length > MAX_PROJECT_PRESENCE_VIDEOS) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: `Presence counts are limited to ${MAX_PROJECT_PRESENCE_VIDEOS} videos.`,
      });
    }

    const videoIds = [...new Set(requestedVideoIds)];
    const videos = await Promise.all(videoIds.map((videoId) => ctx.db.get(videoId)));

    // Skip (rather than reject) videos that were deleted or moved out of the
    // project: this subscription's args race against those mutations, and a
    // thrown error here would crash every open dashboard for the project.
    // Omission reveals nothing about foreign videos — it is indistinguishable
    // from a nonexistent ID.
    const authorizedVideoIds = videoIds.filter((videoId, index) => {
      const video = videos[index];
      return video !== null && video.projectId === args.projectId;
    });

    const counts: Record<string, number> = {};

    await Promise.all(
      authorizedVideoIds.map(async (videoId) => {
        const onlineUsers = await presence.listRoom(ctx, roomIdForVideo(videoId), true);
        counts[videoId] = onlineUsers.length;
      }),
    );

    return { counts };
  },
});
