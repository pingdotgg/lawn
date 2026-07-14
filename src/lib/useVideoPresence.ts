"use client";

import { useConvex, useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const STORAGE_KEY_CLIENT_ID = "lawn.presence.client_id";
const DEFAULT_HEARTBEAT_INTERVAL_MS = 15_000;
const DISCONNECT_PATH = "videoPresence:disconnect";
/** Throttle presence playback publishes while playing. */
const PLAYBACK_THROTTLE_MS = 400;

export type VideoPlaybackPresence = {
  currentTime: number;
  paused: boolean;
  updatedAt: number;
};

export type VideoWatcher = {
  userId: string;
  online: boolean;
  kind: "member" | "guest";
  displayName: string;
  avatarUrl?: string;
  leading: boolean;
  playback?: VideoPlaybackPresence;
};

function createClientId() {
  return crypto.randomUUID().replace(/-/g, "");
}

function getOrCreateClientId() {
  const existing = window.localStorage.getItem(STORAGE_KEY_CLIENT_ID);
  if (existing && existing.trim().length > 0) {
    return existing;
  }

  const clientId = createClientId();
  window.localStorage.setItem(STORAGE_KEY_CLIENT_ID, clientId);
  return clientId;
}

export function useVideoPresence(input: {
  videoId?: Id<"videos">;
  enabled?: boolean;
  shareToken?: string;
  intervalMs?: number;
  /**
   * Guests auto-follow when a leader is active (good default).
   * Team members default to free viewing and can toggle follow.
   */
  isGuestViewer?: boolean;
}) {
  const convex = useConvex();
  const heartbeat = useMutation(api.videoPresence.heartbeat);
  const disconnect = useMutation(api.videoPresence.disconnect);
  const updatePlayback = useMutation(api.videoPresence.updatePlayback);
  const claimLeadMutation = useMutation(api.videoPresence.claimLead);
  const releaseLeadMutation = useMutation(api.videoPresence.releaseLead);

  const [clientId, setClientId] = useState<string | null>(null);
  const [roomToken, setRoomToken] = useState<string | null>(null);
  const [selfUserId, setSelfUserId] = useState<string | null>(null);
  const [followEnabled, setFollowEnabled] = useState(Boolean(input.isGuestViewer));
  const sessionTokenRef = useRef<string | null>(null);
  const latestPlaybackRef = useRef<VideoPlaybackPresence | null>(null);
  const lastPublishAtRef = useRef(0);
  const publishInFlightRef = useRef(false);
  const pendingForcePublishRef = useRef(false);

  const {
    videoId,
    enabled = true,
    shareToken,
    intervalMs = DEFAULT_HEARTBEAT_INTERVAL_MS,
    isGuestViewer = false,
  } = input;

  useEffect(() => {
    if (typeof window === "undefined") return;
    setClientId(getOrCreateClientId());
  }, []);

  // Guests auto-follow; members keep local toggle across video changes.
  useEffect(() => {
    if (isGuestViewer) {
      setFollowEnabled(true);
    }
  }, [isGuestViewer, videoId]);

  useEffect(() => {
    if (!enabled || !videoId || !clientId) {
      setRoomToken(null);
      setSelfUserId(null);
      return;
    }

    let active = true;
    const sessionId = crypto.randomUUID();

    const runHeartbeat = async () => {
      const result = await heartbeat({
        videoId,
        sessionId,
        clientId,
        interval: intervalMs,
        shareToken,
        playback: latestPlaybackRef.current ?? undefined,
      });

      if (!active) return;
      sessionTokenRef.current = result.sessionToken;
      setRoomToken(result.roomToken);
      setSelfUserId(result.userId);
    };

    const handleBeforeUnload = () => {
      const sessionToken = sessionTokenRef.current;
      if (!sessionToken) return;

      const payload = {
        path: DISCONNECT_PATH,
        args: { sessionToken },
      };

      const blob = new Blob([JSON.stringify(payload)], {
        type: "application/json",
      });
      navigator.sendBeacon(`${convex.url}/api/mutation`, blob);
    };

    void runHeartbeat();
    const heartbeatIntervalId = window.setInterval(() => {
      void runHeartbeat();
    }, intervalMs);

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      active = false;
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.clearInterval(heartbeatIntervalId);

      const sessionToken = sessionTokenRef.current;
      sessionTokenRef.current = null;
      setRoomToken(null);
      setSelfUserId(null);
      if (sessionToken) {
        void disconnect({ sessionToken }).catch(() => {
          // Ignore disconnect failures during teardown.
        });
      }
    };
  }, [clientId, convex.url, disconnect, enabled, heartbeat, intervalMs, shareToken, videoId]);

  const state = useQuery(api.videoPresence.list, roomToken ? { roomToken } : "skip");
  const canLead = useQuery(api.videoPresence.canLead, videoId && enabled ? { videoId } : "skip");
  const leaderRecord = useQuery(
    api.videoPresence.getLeader,
    videoId && enabled ? { videoId, shareToken } : "skip",
  );

  const watchers = useMemo(() => {
    if (!state) return [];

    return state
      .filter((watcher) => watcher.online)
      .map((watcher) => ({
        userId: watcher.userId,
        online: watcher.online,
        kind: watcher.data?.kind ?? "member",
        displayName: watcher.data?.displayName ?? "Member",
        avatarUrl: watcher.data?.avatarUrl,
        leading: Boolean(watcher.data?.leading),
        playback: watcher.data?.playback,
      })) satisfies VideoWatcher[];
  }, [state]);

  // Prefer the auth-backed leader table, fall back to presence leading flag.
  const leader = useMemo(() => {
    if (leaderRecord) {
      const onlineLeader = watchers.find((w) => w.userId === leaderRecord.leaderUserId);
      if (onlineLeader) {
        return {
          userId: onlineLeader.userId,
          displayName: onlineLeader.displayName || leaderRecord.displayName,
          playback: onlineLeader.playback,
          online: true as const,
        };
      }
      // Leader claimed but offline — still expose name so UI can show lock state.
      return {
        userId: leaderRecord.leaderUserId,
        displayName: leaderRecord.displayName,
        playback: undefined as VideoPlaybackPresence | undefined,
        online: false as const,
      };
    }

    const fromPresence = watchers.find((w) => w.leading);
    if (!fromPresence) return null;
    return {
      userId: fromPresence.userId,
      displayName: fromPresence.displayName,
      playback: fromPresence.playback,
      online: true as const,
    };
  }, [leaderRecord, watchers]);

  const isLeading = Boolean(selfUserId && leader?.userId === selfUserId);
  const isFollowing = Boolean(followEnabled && leader?.online && !isLeading);

  const flushPlayback = useCallback(
    async (force: boolean) => {
      if (!enabled || !videoId || !clientId) return;
      const playback = latestPlaybackRef.current;
      if (!playback) return;

      const now = Date.now();
      if (!force && now - lastPublishAtRef.current < PLAYBACK_THROTTLE_MS) {
        pendingForcePublishRef.current = false;
        return;
      }

      if (publishInFlightRef.current) {
        if (force) pendingForcePublishRef.current = true;
        return;
      }

      publishInFlightRef.current = true;
      lastPublishAtRef.current = now;
      pendingForcePublishRef.current = false;

      try {
        await updatePlayback({
          videoId,
          clientId,
          shareToken,
          playback,
        });
      } catch {
        // Presence publishes are best-effort; next tick will retry.
      } finally {
        publishInFlightRef.current = false;
        if (pendingForcePublishRef.current) {
          pendingForcePublishRef.current = false;
          void flushPlayback(true);
        }
      }
    },
    [clientId, enabled, shareToken, updatePlayback, videoId],
  );

  const publishPlayback = useCallback(
    (next: { currentTime: number; paused: boolean }, options?: { force?: boolean }) => {
      const playback: VideoPlaybackPresence = {
        currentTime: Math.max(0, next.currentTime),
        paused: next.paused,
        updatedAt: Date.now(),
      };
      latestPlaybackRef.current = playback;

      const force = options?.force ?? next.paused;
      void flushPlayback(force);
    },
    [flushPlayback],
  );

  const claimLead = useCallback(async () => {
    if (!videoId) return;
    await claimLeadMutation({
      videoId,
      playback: latestPlaybackRef.current ?? undefined,
    });
    // Leading means you drive; stop following.
    setFollowEnabled(false);
  }, [claimLeadMutation, videoId]);

  const releaseLead = useCallback(async () => {
    if (!videoId) return;
    await releaseLeadMutation({ videoId });
  }, [releaseLeadMutation, videoId]);

  const setFollowing = useCallback(
    (next: boolean) => {
      // Can't follow yourself while leading.
      if (isLeading && next) return;
      setFollowEnabled(next);
    },
    [isLeading],
  );

  return {
    watchers,
    isLoading: roomToken !== null && state === undefined,
    selfUserId,
    clientId,
    canLead: Boolean(canLead),
    leader,
    isLeading,
    isFollowing,
    followEnabled,
    setFollowing,
    claimLead,
    releaseLead,
    publishPlayback,
  };
}

/**
 * Estimate the leader's current playhead, compensating for network delay
 * while they are actively playing.
 */
export function estimatePlaybackTime(
  playback: VideoPlaybackPresence | undefined,
  nowMs: number = Date.now(),
): number | null {
  if (!playback) return null;
  if (playback.paused) return playback.currentTime;
  const elapsed = Math.max(0, (nowMs - playback.updatedAt) / 1000);
  return playback.currentTime + elapsed;
}
