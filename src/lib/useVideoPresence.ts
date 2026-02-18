"use client";

import { useConvex, useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { useEffect, useMemo, useRef, useState } from "react";

const STORAGE_KEY_CLIENT_ID = "lawn.presence.client_id";
const DEFAULT_HEARTBEAT_INTERVAL_MS = 15_000;
const DISCONNECT_PATH = "videoPresence:disconnect";

export type VideoWatcher = {
  userId: string;
  online: boolean;
  kind: "member" | "guest";
  displayName: string;
  avatarUrl?: string;
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
}) {
  const convex = useConvex();
  const heartbeat = useMutation(api.videoPresence.heartbeat);
  const disconnect = useMutation(api.videoPresence.disconnect);

  const [clientId, setClientId] = useState<string | null>(null);
  const [roomToken, setRoomToken] = useState<string | null>(null);
  const sessionTokenRef = useRef<string | null>(null);

  const {
    videoId,
    enabled = true,
    shareToken,
    intervalMs = DEFAULT_HEARTBEAT_INTERVAL_MS,
  } = input;

  useEffect(() => {
    if (typeof window === "undefined") return;
    setClientId(getOrCreateClientId());
  }, []);

  useEffect(() => {
    if (!enabled || !videoId || !clientId) {
      setRoomToken(null);
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
      });

      if (!active) return;
      sessionTokenRef.current = result.sessionToken;
      setRoomToken(result.roomToken);
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
      if (sessionToken) {
        void disconnect({ sessionToken }).catch(() => {
          // Ignore disconnect failures during teardown.
        });
      }
    };
  }, [clientId, convex.url, disconnect, enabled, heartbeat, intervalMs, shareToken, videoId]);

  const state = useQuery(
    api.videoPresence.list,
    roomToken ? { roomToken } : "skip",
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
      })) satisfies VideoWatcher[];
  }, [state]);

  return {
    watchers,
    isLoading: roomToken !== null && state === undefined,
  };
}
