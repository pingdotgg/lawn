"use client";

import { useEffect, useRef } from "react";
import type { VideoPlayerHandle } from "@/components/video-player/VideoPlayer";
import {
  estimatePlaybackTime,
  type VideoPlaybackPresence,
} from "@/lib/useVideoPresence";

/** Only seek when drift exceeds this (seconds) to avoid thrashing. */
const DRIFT_SEEK_SECONDS = 0.85;
/** Ignore leader updates older than the last applied timestamp. */
const STALE_EPSILON_MS = 0;

/**
 * Keep a local VideoPlayer in sync with a leader's playback presence.
 * Applies play/pause immediately and seeks only on meaningful drift.
 */
export function useGangPlaybackSync(input: {
  enabled: boolean;
  playerRef: React.RefObject<VideoPlayerHandle | null>;
  leaderPlayback?: VideoPlaybackPresence;
  leaderUserId?: string | null;
}) {
  const { enabled, playerRef, leaderPlayback, leaderUserId } = input;
  const lastAppliedUpdatedAtRef = useRef(0);
  const lastLeaderUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      lastAppliedUpdatedAtRef.current = 0;
      return;
    }
    if (!leaderPlayback) return;

    // New leader — force re-apply.
    if (leaderUserId && leaderUserId !== lastLeaderUserIdRef.current) {
      lastLeaderUserIdRef.current = leaderUserId;
      lastAppliedUpdatedAtRef.current = 0;
    }

    if (leaderPlayback.updatedAt + STALE_EPSILON_MS < lastAppliedUpdatedAtRef.current) {
      return;
    }

    const player = playerRef.current;
    if (!player) return;

    const estimated = estimatePlaybackTime(leaderPlayback);
    if (estimated === null) return;

    const local = player.getPlaybackState();
    const drift = Math.abs(local.currentTime - estimated);
    const pauseMismatch = local.paused !== leaderPlayback.paused;

    // Seek only when meaningfully out of sync (or on a large jump/seek by leader).
    if (drift > DRIFT_SEEK_SECONDS) {
      player.seekTo(estimated, { play: !leaderPlayback.paused });
      lastAppliedUpdatedAtRef.current = leaderPlayback.updatedAt;
      return;
    }

    if (pauseMismatch) {
      if (leaderPlayback.paused) {
        player.pause();
      } else {
        player.play();
      }
      lastAppliedUpdatedAtRef.current = leaderPlayback.updatedAt;
      return;
    }

    // Soft-track while playing without seeking (small drift is fine).
    lastAppliedUpdatedAtRef.current = Math.max(
      lastAppliedUpdatedAtRef.current,
      leaderPlayback.updatedAt,
    );
  }, [enabled, leaderPlayback, leaderUserId, playerRef]);
}
