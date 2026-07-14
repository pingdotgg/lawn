"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Copy, Check, Plus, Trash2, Eye, Lock, ExternalLink, Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, formatRelativeTime } from "@/lib/utils";
import { copyTextToClipboard } from "@/lib/clipboard";
import { watchPath } from "@/lib/routes";
import { createRequestEpoch } from "@/lib/requestEpoch";

interface ShareDialogProps {
  videoId: Id<"videos">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareDialog({ videoId, open, onOpenChange }: ShareDialogProps) {
  const video = useQuery(api.videos.get, { videoId });
  const shareLinks = useQuery(api.shareLinks.list, { videoId });
  const createShareLink = useMutation(api.shareLinks.create);
  const deleteShareLink = useMutation(api.shareLinks.remove);
  const setVisibility = useMutation(api.videos.setVisibility);
  const setVersionBrowsing = useMutation(api.videos.setPublicVersionBrowsing);
  const setAllowGuestComments = useMutation(api.videos.setAllowGuestComments);

  const [isCreating, setIsCreating] = useState(false);
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false);
  const [isUpdatingVersionBrowsing, setIsUpdatingVersionBrowsing] = useState(false);
  const [isUpdatingGuestComments, setIsUpdatingGuestComments] = useState(false);
  const [deletingLinkId, setDeletingLinkId] = useState<Id<"shareLinks"> | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const [copyFailureUrl, setCopyFailureUrl] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [newLinkOptions, setNewLinkOptions] = useState({
    expiresInDays: undefined as number | undefined,
    password: undefined as string | undefined,
  });
  const copySequenceRef = useRef(0);
  const copyTimeoutRef = useRef<number | null>(null);
  const mutationContextEpochRef = useRef(createRequestEpoch());
  const activeVideoIdRef = useRef(videoId);
  const activeOpenRef = useRef(open);
  activeVideoIdRef.current = videoId;
  activeOpenRef.current = open;

  const isViewer = video?.role === "viewer";
  const canManageSharing = video != null && !isViewer;

  const clearCopyFeedback = useCallback(() => {
    copySequenceRef.current += 1;
    if (copyTimeoutRef.current !== null) {
      window.clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = null;
    }
    setCopiedId(null);
    setCopyStatus(null);
    setCopyFailureUrl(null);
  }, []);

  const resetMutationState = useCallback(() => {
    setIsCreating(false);
    setIsUpdatingVisibility(false);
    setIsUpdatingVersionBrowsing(false);
    setIsUpdatingGuestComments(false);
    setDeletingLinkId(null);
    setMutationError(null);
    setNewLinkOptions({ expiresInDays: undefined, password: undefined });
  }, []);

  const isMutationCurrent = useCallback(
    (contextEpoch: number, requestVideoId: Id<"videos">) =>
      mutationContextEpochRef.current.isCurrent(contextEpoch) &&
      activeVideoIdRef.current === requestVideoId &&
      activeOpenRef.current,
    [],
  );

  useEffect(() => {
    mutationContextEpochRef.current.invalidate();
    clearCopyFeedback();
    resetMutationState();

    return () => {
      mutationContextEpochRef.current.invalidate();
      copySequenceRef.current += 1;
      if (copyTimeoutRef.current !== null) {
        window.clearTimeout(copyTimeoutRef.current);
        copyTimeoutRef.current = null;
      }
    };
  }, [clearCopyFeedback, open, resetMutationState, videoId]);

  const handleDialogOpenChange = (nextOpen: boolean) => {
    activeOpenRef.current = nextOpen;
    if (!nextOpen) {
      mutationContextEpochRef.current.invalidate();
      clearCopyFeedback();
      resetMutationState();
    }
    onOpenChange(nextOpen);
  };

  const handleCreateLink = async () => {
    if (!canManageSharing) return;
    const contextEpoch = mutationContextEpochRef.current.current();
    const requestVideoId = videoId;
    setIsCreating(true);
    setMutationError(null);
    try {
      await createShareLink({
        videoId,
        expiresInDays: newLinkOptions.expiresInDays,
        allowDownload: false,
        password: newLinkOptions.password,
      });
      if (!isMutationCurrent(contextEpoch, requestVideoId)) return;
      setNewLinkOptions({
        expiresInDays: undefined,
        password: undefined,
      });
    } catch {
      if (!isMutationCurrent(contextEpoch, requestVideoId)) return;
      setMutationError("Could not create the restricted link. Please try again.");
    } finally {
      if (isMutationCurrent(contextEpoch, requestVideoId)) {
        setIsCreating(false);
      }
    }
  };

  const handleSetVisibility = async (visibility: "public" | "private") => {
    if (!video || !canManageSharing || isUpdatingVisibility || video.visibility === visibility)
      return;
    const contextEpoch = mutationContextEpochRef.current.current();
    const requestVideoId = videoId;
    setIsUpdatingVisibility(true);
    setMutationError(null);
    try {
      await setVisibility({ videoId, visibility });
    } catch {
      if (!isMutationCurrent(contextEpoch, requestVideoId)) return;
      setMutationError("Could not update video visibility. Please try again.");
    } finally {
      if (isMutationCurrent(contextEpoch, requestVideoId)) {
        setIsUpdatingVisibility(false);
      }
    }
  };

  const versionBrowsingEnabled = video?.allowPublicVersionBrowsing !== false;
  const guestCommentsEnabled = video?.allowGuestComments === true;

  const handleSetVersionBrowsing = async (enabled: boolean) => {
    if (
      !video ||
      !canManageSharing ||
      isUpdatingVersionBrowsing ||
      versionBrowsingEnabled === enabled
    )
      return;
    const contextEpoch = mutationContextEpochRef.current.current();
    const requestVideoId = videoId;
    setIsUpdatingVersionBrowsing(true);
    setMutationError(null);
    try {
      await setVersionBrowsing({ videoId, enabled });
    } catch {
      if (!isMutationCurrent(contextEpoch, requestVideoId)) return;
      setMutationError("Could not update version browsing. Please try again.");
    } finally {
      if (isMutationCurrent(contextEpoch, requestVideoId)) {
        setIsUpdatingVersionBrowsing(false);
      }
    }
  };

  const handleSetGuestComments = async (enabled: boolean) => {
    if (
      !video ||
      !canManageSharing ||
      isUpdatingGuestComments ||
      guestCommentsEnabled === enabled
    )
      return;
    const contextEpoch = mutationContextEpochRef.current.current();
    const requestVideoId = videoId;
    setIsUpdatingGuestComments(true);
    setMutationError(null);
    try {
      await setAllowGuestComments({ videoId, enabled });
    } catch {
      if (!isMutationCurrent(contextEpoch, requestVideoId)) return;
      setMutationError("Could not update guest comments. Please try again.");
    } finally {
      if (isMutationCurrent(contextEpoch, requestVideoId)) {
        setIsUpdatingGuestComments(false);
      }
    }
  };

  const copyLink = async (id: string, path: string) => {
    const requestId = copySequenceRef.current + 1;
    copySequenceRef.current = requestId;
    if (copyTimeoutRef.current !== null) {
      window.clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = null;
    }
    setCopiedId(null);
    setCopyStatus(null);
    setCopyFailureUrl(null);
    const url = `${window.location.origin}${path}`;
    const copied = await copyTextToClipboard(url);
    if (requestId !== copySequenceRef.current || activeVideoIdRef.current !== videoId || !open) {
      return;
    }
    if (!copied) {
      setCopyStatus({
        tone: "error",
        message: "Could not copy the link. Please copy it manually.",
      });
      setCopyFailureUrl(url);
      return;
    }

    setCopiedId(id);
    setCopyStatus({ tone: "success", message: "Link copied to clipboard." });
    copyTimeoutRef.current = window.setTimeout(() => {
      if (copySequenceRef.current === requestId) {
        setCopiedId((current) => (current === id ? null : current));
      }
      copyTimeoutRef.current = null;
    }, 2000);
  };

  const handleCopyLink = async (token: string) => {
    await copyLink(token, `/share/${token}`);
  };

  const handleCopyPublicLink = async () => {
    if (!video?.publicId) return;
    await copyLink("public", watchPath(video.publicId));
  };

  const handleDeleteLink = async (linkId: Id<"shareLinks">) => {
    if (!canManageSharing) return;
    if (!confirm("Are you sure you want to delete this share link?")) return;
    const contextEpoch = mutationContextEpochRef.current.current();
    const requestVideoId = videoId;
    setDeletingLinkId(linkId);
    setMutationError(null);
    try {
      await deleteShareLink({ linkId });
    } catch {
      if (!isMutationCurrent(contextEpoch, requestVideoId)) return;
      setMutationError("Could not delete the restricted link. Please try again.");
    } finally {
      if (isMutationCurrent(contextEpoch, requestVideoId)) {
        setDeletingLinkId(null);
      }
    }
  };

  const publicWatchPath = video?.publicId ? watchPath(video.publicId) : null;

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Share video</DialogTitle>
          <DialogDescription>
            Public videos can be viewed by anyone with the URL. Enable guest comments to let
            reviewers leave feedback without signing in.
          </DialogDescription>
        </DialogHeader>

        {isViewer ? (
          <p className="border-2 border-[#1a1a1a] bg-[#e8e8e0] px-3 py-2 text-sm text-[#1a1a1a]">
            View-only access: you can copy or open links, but only team members can change sharing
            settings.
          </p>
        ) : null}

        {mutationError ? (
          <p role="alert" aria-live="assertive" className="text-sm font-bold text-[#991b1b]">
            {mutationError}
          </p>
        ) : null}

        {copyStatus ? (
          <div
            role={copyStatus.tone === "error" ? "alert" : "status"}
            aria-live={copyStatus.tone === "error" ? "assertive" : "polite"}
            className={cn(
              "border-2 px-3 py-2 text-sm font-bold",
              copyStatus.tone === "success"
                ? "border-[#2d5a2d] bg-[#dce8d8] text-[#2d5a2d]"
                : "border-[#dc2626] bg-[#fee2e2] text-[#991b1b]",
            )}
          >
            <p>{copyStatus.message}</p>
            {copyFailureUrl ? (
              <Input
                className="mt-2 bg-white font-mono text-xs font-normal"
                aria-label="Link to copy manually"
                readOnly
                value={copyFailureUrl}
                onFocus={(event) => event.currentTarget.select()}
                onClick={(event) => event.currentTarget.select()}
              />
            ) : null}
          </div>
        ) : null}

        {/* Visibility */}
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={video?.visibility === "public" ? "default" : "outline"}
              disabled={!canManageSharing || isUpdatingVisibility}
              aria-pressed={video?.visibility === "public"}
              onClick={() => void handleSetVisibility("public")}
            >
              <Globe className="mr-2 h-4 w-4" />
              Public
            </Button>
            <Button
              variant={video?.visibility === "private" ? "default" : "outline"}
              disabled={!canManageSharing || isUpdatingVisibility}
              aria-pressed={video?.visibility === "private"}
              onClick={() => void handleSetVisibility("private")}
            >
              <Lock className="mr-2 h-4 w-4" />
              Private
            </Button>
          </div>
          <p className="text-xs text-[#888]">
            Private disables the public URL. Restricted share links still work.
          </p>
        </div>

        {/* Guest comments */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-[#1a1a1a]">Allow guest comments</h3>
            <p className="text-xs text-[#888]">
              Anyone with the public or restricted link can comment without signing in.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            <span
              className={cn(
                "text-xs font-bold tracking-wide uppercase",
                guestCommentsEnabled ? "text-[#2d5a2d]" : "text-[#888]",
              )}
            >
              {guestCommentsEnabled ? "On" : "Off"}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={guestCommentsEnabled}
              aria-label="Allow guest comments"
              disabled={!canManageSharing || isUpdatingGuestComments}
              onClick={() => void handleSetGuestComments(!guestCommentsEnabled)}
              className={cn(
                "relative h-7 w-12 shrink-0 border-2 border-[#1a1a1a] transition-colors disabled:opacity-50",
                guestCommentsEnabled ? "bg-[#2d5a2d]" : "bg-[#ccc]",
              )}
            >
              <span
                className={cn(
                  "absolute top-1 h-4 w-4 border-2 border-[#1a1a1a] bg-[#f0f0e8] transition-all",
                  guestCommentsEnabled ? "left-[26px]" : "left-0.5",
                )}
              />
            </button>
          </div>
        </div>

        {/* Public URL + version browsing */}
        {video?.visibility === "public" ? (
          <div className="space-y-3">
            {publicWatchPath ? (
              <div className="flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate border-2 border-[#1a1a1a] bg-[#e8e8e0] px-3 py-2 font-mono text-sm">
                  {publicWatchPath}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => void handleCopyPublicLink()}
                  aria-label="Copy public URL"
                >
                  {copiedId === "public" ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => window.open(publicWatchPath, "_blank")}
                  aria-label="Open public URL"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            ) : null}

            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-[#1a1a1a]">Version browsing</h3>
                <p className="text-xs text-[#888]">Let viewers switch between versions.</p>
              </div>
              <div className="flex shrink-0 items-center gap-2.5">
                <span
                  className={cn(
                    "text-xs font-bold tracking-wide uppercase",
                    versionBrowsingEnabled ? "text-[#2d5a2d]" : "text-[#888]",
                  )}
                >
                  {versionBrowsingEnabled ? "On" : "Off"}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={versionBrowsingEnabled}
                  aria-label="Version browsing"
                  disabled={!canManageSharing || isUpdatingVersionBrowsing}
                  onClick={() => void handleSetVersionBrowsing(!versionBrowsingEnabled)}
                  className={cn(
                    "relative h-7 w-12 shrink-0 border-2 border-[#1a1a1a] transition-colors disabled:opacity-50",
                    versionBrowsingEnabled ? "bg-[#2d5a2d]" : "bg-[#ccc]",
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-1 h-4 w-4 border-2 border-[#1a1a1a] bg-[#f0f0e8] transition-all",
                      versionBrowsingEnabled ? "left-[26px]" : "left-0.5",
                    )}
                  />
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <Separator />

        {/* Restricted links */}
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-bold text-[#1a1a1a]">Restricted links</h3>
            <p className="text-xs text-[#888]">
              Time-limited, optionally password-protected links.
            </p>
          </div>

          {canManageSharing ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      {newLinkOptions.expiresInDays
                        ? `${newLinkOptions.expiresInDays} days`
                        : "Never expires"}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem
                      onClick={() => setNewLinkOptions((o) => ({ ...o, expiresInDays: undefined }))}
                    >
                      Never expires
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setNewLinkOptions((o) => ({ ...o, expiresInDays: 1 }))}
                    >
                      1 day
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setNewLinkOptions((o) => ({ ...o, expiresInDays: 7 }))}
                    >
                      7 days
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setNewLinkOptions((o) => ({ ...o, expiresInDays: 30 }))}
                    >
                      30 days
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Input
                  type="password"
                  placeholder="Password (optional)"
                  value={newLinkOptions.password || ""}
                  onChange={(e) =>
                    setNewLinkOptions((o) => ({
                      ...o,
                      password: e.target.value || undefined,
                    }))
                  }
                />
              </div>

              <Button onClick={handleCreateLink} disabled={isCreating} className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                {isCreating ? "Creating..." : "Create link"}
              </Button>
            </>
          ) : null}

          {shareLinks === undefined ? (
            <p role="status" aria-live="polite" className="text-sm text-[#888]">
              Loading links...
            </p>
          ) : shareLinks.length === 0 ? (
            <p className="text-sm text-[#888]">No share links yet</p>
          ) : (
            <div className="max-h-64 divide-y-2 divide-[#1a1a1a] overflow-y-auto border-2 border-[#1a1a1a]">
              {shareLinks.map((link) => (
                <div key={link._id} className="flex items-center justify-between gap-2 p-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <code className="max-w-[200px] truncate bg-[#e8e8e0] px-2 py-0.5 font-mono text-sm">
                        /share/{link.token}
                      </code>
                      {link.isExpired ? <Badge variant="destructive">Expired</Badge> : null}
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-[#888]">
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {link.viewCount} views
                      </span>
                      {link.hasPassword ? (
                        <span className="flex items-center gap-1">
                          <Lock className="h-3 w-3" />
                          Protected
                        </span>
                      ) : null}
                      {link.expiresAt ? (
                        <span>Expires {formatRelativeTime(link.expiresAt)}</span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => void handleCopyLink(link.token)}
                      aria-label="Copy restricted link"
                    >
                      {copiedId === link.token ? (
                        <Check className="h-4 w-4 text-[#2d5a2d]" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => window.open(`/share/${link.token}`, "_blank")}
                      aria-label="Open restricted link"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    {canManageSharing ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-[#dc2626] hover:text-[#dc2626]"
                        disabled={deletingLinkId !== null}
                        onClick={() => void handleDeleteLink(link._id)}
                        aria-label="Delete restricted link"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
