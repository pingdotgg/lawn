"use client";

import { Lock, LockOpen, Radio, Unlink } from "lucide-react";
import { cn } from "@/lib/utils";

export function GangPlaybackControls({
  canLead,
  isLeading,
  leader,
  isFollowing,
  followEnabled,
  onClaimLead,
  onReleaseLead,
  onToggleFollow,
  className,
  tone = "light",
}: {
  canLead: boolean;
  isLeading: boolean;
  leader: { displayName: string; online: boolean } | null;
  isFollowing: boolean;
  followEnabled: boolean;
  onClaimLead: () => void;
  onReleaseLead: () => void;
  onToggleFollow: () => void;
  className?: string;
  /** light = cream page chrome; dark = on-video black bar */
  tone?: "light" | "dark";
}) {
  const hasLeader = Boolean(leader);
  const showFollowToggle = hasLeader && !isLeading;
  const isDark = tone === "dark";

  const solidLead = cn(
    "inline-flex h-8 items-center gap-1.5 border-2 px-3 text-[11px] font-bold tracking-wide uppercase transition",
    isDark
      ? "border-white/30 bg-[#2d5a2d] text-[#f0f0e8] hover:bg-[#3a6a3a]"
      : "border-[#1a1a1a] bg-[#2d5a2d] text-[#f0f0e8] hover:bg-[#3a6a3a]",
  );

  const outlineBtn = cn(
    "inline-flex h-8 items-center gap-1.5 border-2 px-3 text-[11px] font-bold tracking-wide uppercase transition",
    isDark
      ? "border-white/25 bg-transparent text-white hover:border-white/50 hover:bg-white/10"
      : "border-[#1a1a1a] bg-transparent text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#f0f0e8]",
  );

  const ghostBtn = cn(
    "inline-flex h-8 items-center gap-1.5 border-2 border-transparent px-3 text-[11px] font-bold tracking-wide uppercase transition",
    isDark
      ? "text-white/80 hover:border-white/25 hover:bg-white/10 hover:text-white"
      : "text-[#1a1a1a] hover:border-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#f0f0e8]",
  );

  const followingPill = cn(
    "inline-flex items-center gap-1.5 border-2 px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase",
    isDark
      ? "border-white/30 bg-white text-[#1a1a1a]"
      : "border-[#1a1a1a] bg-[#1a1a1a] text-[#f0f0e8]",
  );

  const leaderPill = cn(
    "inline-flex items-center gap-1.5 border-2 px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase",
    isDark ? "border-white/20 text-white/60" : "border-[#ccc] text-[#888]",
  );

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {isLeading ? (
        <button type="button" className={solidLead} onClick={onReleaseLead} title="Stop leading">
          <Lock className="h-3.5 w-3.5" />
          Leading
        </button>
      ) : canLead ? (
        <button
          type="button"
          className={outlineBtn}
          onClick={onClaimLead}
          title="Drive play/pause/seek for viewers who follow"
        >
          <LockOpen className="h-3.5 w-3.5" />
          Lead
        </button>
      ) : null}

      {isFollowing ? (
        <span className={followingPill} title="Your player matches the leader">
          <Radio className={cn("h-3 w-3", isDark ? "text-[#2d5a2d]" : "text-[#7cb87c]")} />
          Following {leader?.displayName ?? "leader"}
        </span>
      ) : hasLeader && leader && !isLeading ? (
        <span
          className={leaderPill}
          title={leader.online ? "Leader is live" : "Leader is offline"}
        >
          <Lock className="h-3 w-3" />
          {leader.online ? `Led by ${leader.displayName}` : `${leader.displayName} (offline)`}
        </span>
      ) : null}

      {showFollowToggle ? (
        <button
          type="button"
          className={ghostBtn}
          onClick={onToggleFollow}
          title={followEnabled ? "Stop matching the leader" : "Match the leader's playback"}
        >
          {followEnabled ? (
            <>
              <Unlink className="h-3.5 w-3.5" />
              Unfollow
            </>
          ) : (
            <>
              <Radio className="h-3.5 w-3.5" />
              Follow
            </>
          )}
        </button>
      ) : null}
    </div>
  );
}
