import { useConvex, useMutation, useAction } from "convex/react";
import { api } from "@convex/_generated/api";
import { useLocation, useNavigate, useParams } from "@tanstack/react-router";
import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  VideoPlayer,
  type VideoPlaybackIssue,
  type VideoPlayerHandle,
} from "@/components/video-player/VideoPlayer";
import { CommentList } from "@/components/comments/CommentList";
import { CommentInput } from "@/components/comments/CommentInput";
import { ShareDialog } from "@/components/ShareDialog";
import {
  VideoWorkflowStatusControl,
  type VideoWorkflowStatus,
} from "@/components/videos/VideoWorkflowStatusControl";
import { cn, formatDuration } from "@/lib/utils";
import { buildCommentsCsv, buildCommentsCsvFilename } from "@/lib/commentCsv";
import { triggerTextDownload } from "@/lib/download";
import { useVideoPresence } from "@/lib/useVideoPresence";
import { useSidebarCollapsed } from "@/lib/useSidebarCollapsed";
import { VideoWatchers } from "@/components/presence/VideoWatchers";
import { DashboardHeader } from "@/components/DashboardHeader";
import { UploadButton } from "@/components/upload/UploadButton";
import { useDashboardUploadContext } from "@/lib/dashboardUploadContext";
import {
  Edit2,
  Check,
  X,
  Link as LinkIcon,
  MessageSquare,
  MoreVertical,
  Download,
  PanelRightClose,
  PanelRightOpen,
  Layers3,
  Upload,
  Trash2,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Id } from "@convex/_generated/dataModel";
import { projectPath, teamHomePath, videoPath } from "@/lib/routes";
import { findPreferredReplacementVideoId } from "@/lib/videoVersionDeletion";
import { useRoutePrewarmIntent } from "@/lib/useRoutePrewarmIntent";
import {
  selectDashboardPlaybackUrl,
  type DashboardPlaybackSource,
} from "@/lib/dashboardPlaybackSource";
import { prewarmProject } from "./-project.data";
import { prewarmTeam } from "./-team.data";
import { prewarmVideo, useVideoData } from "./-video.data";
import { ExpandableTitle } from "@/components/ExpandableTitle";

type VideoVersion = {
  _id: Id<"videos">;
  projectId: Id<"projects">;
  versionNumber: number;
  status: string;
  isLatestVersion: boolean;
};

const MAX_AUTOMATIC_PLAYBACK_ATTEMPTS = 3;

function versionStatusLabel(status: string) {
  switch (status) {
    case "uploading":
      return "Uploading";
    case "processing":
      return "Processing";
    case "failed":
      return "Failed";
    default:
      return "Ready";
  }
}

function focusNearestSurvivingVersion(deleteItem: HTMLElement) {
  const deletingRow = deleteItem.closest<HTMLElement>("[data-version-row]");
  const rowContainer = deletingRow?.parentElement;
  if (!deletingRow || !rowContainer) return;

  const versionRows = Array.from(rowContainer.children).filter(
    (child): child is HTMLElement =>
      child instanceof HTMLElement && child.dataset.versionRow !== undefined,
  );
  const deletingIndex = versionRows.indexOf(deletingRow);
  if (deletingIndex === -1) return;

  const nearestRow = versionRows[deletingIndex + 1] ?? versionRows[deletingIndex - 1];
  nearestRow?.querySelector<HTMLElement>("[data-version-radio-item]")?.focus();
}

function VersionSelectorOption({
  version,
  teamSlug,
  currentVideoId,
  onSelect,
  canDelete,
  deletingVideoId,
  onDelete,
}: {
  version: VideoVersion;
  teamSlug: string;
  currentVideoId: Id<"videos">;
  onSelect: (videoId: Id<"videos">) => void;
  canDelete: boolean;
  deletingVideoId: Id<"videos"> | null;
  onDelete: (version: VideoVersion, beforeDelete: () => void) => void;
}) {
  const convex = useConvex();
  const isDeleting = deletingVideoId === version._id;
  const deletionPending = deletingVideoId !== null;
  const selectionDisabled = isDeleting || deletingVideoId === currentVideoId;
  const prewarmIntentHandlers = useRoutePrewarmIntent(() =>
    prewarmVideo(convex, {
      teamSlug,
      projectId: version.projectId,
      videoId: version._id,
    }),
  );

  return (
    <div
      role="presentation"
      data-version-row
      className={cn(
        "grid max-h-12 grid-cols-[minmax(0,1fr)_auto] overflow-hidden opacity-100 transition-[max-height,opacity,transform] duration-[180ms] motion-reduce:transition-none",
        isDeleting && "max-h-0 -translate-x-4 opacity-0",
      )}
    >
      <DropdownMenuRadioItem
        value={version._id}
        disabled={selectionDisabled}
        data-version-radio-item
        className="min-w-0"
        onSelect={() => onSelect(version._id)}
        {...prewarmIntentHandlers}
      >
        <span className="font-bold">v{version.versionNumber}</span>
        <span className="ml-2 truncate text-xs text-[#888]">
          {version._id === currentVideoId
            ? `${version.isLatestVersion ? "Viewing latest" : "Viewing"} · ${versionStatusLabel(version.status)}`
            : version.isLatestVersion
              ? `Latest · ${versionStatusLabel(version.status)}`
              : versionStatusLabel(version.status)}
        </span>
      </DropdownMenuRadioItem>
      {canDelete && (
        <DropdownMenuItem
          disabled={deletionPending}
          aria-label={`Delete version v${version.versionNumber}`}
          className="h-10 w-10 justify-center p-0 text-[#dc2626] focus:text-[#dc2626]"
          onSelect={(event) => {
            event.preventDefault();
            const deleteItem = event.currentTarget;
            onDelete(version, () => {
              if (deleteItem instanceof HTMLElement) {
                focusNearestSurvivingVersion(deleteItem);
              }
            });
          }}
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="sr-only">Delete version v{version.versionNumber}</span>
        </DropdownMenuItem>
      )}
    </div>
  );
}

function VersionSelector({
  versions,
  currentVideoId,
  currentVersionNumber,
  teamSlug,
  onSelect,
  canDelete,
  deletingVideoId,
  onDelete,
  compact = false,
}: {
  versions: Array<VideoVersion> | undefined;
  currentVideoId: Id<"videos">;
  currentVersionNumber: number;
  teamSlug: string;
  onSelect: (videoId: Id<"videos">) => void;
  canDelete: boolean;
  deletingVideoId: Id<"videos"> | null;
  onDelete: (version: VideoVersion, beforeDelete: () => void) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const lastSettledVersionsRef = useRef(versions);
  useEffect(() => {
    if (!deletingVideoId) {
      lastSettledVersionsRef.current = versions;
    }
  }, [deletingVideoId, versions]);
  const displayedVersions = deletingVideoId ? lastSettledVersionsRef.current : versions;
  const deletingVersionNumber = displayedVersions?.find(
    (version) => version._id === deletingVideoId,
  )?.versionNumber;
  const deletionPending = deletingVideoId !== null;
  const triggerLabel = deletionPending
    ? deletingVersionNumber
      ? `Deleting version v${deletingVersionNumber}`
      : "Deleting video version"
    : `Select video version, currently v${currentVersionNumber}`;

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size={compact ? "icon" : "default"}
            className={compact ? "h-8 w-8" : undefined}
            aria-label={triggerLabel}
            aria-busy={deletionPending}
          >
            {deletionPending || displayedVersions === undefined ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Layers3 className="h-4 w-4" aria-hidden="true" />
            )}
            {!compact && <span>v{currentVersionNumber}</span>}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-52" aria-busy={deletionPending}>
          <DropdownMenuLabel>Video versions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {displayedVersions === undefined ? (
            <DropdownMenuItem disabled>Loading versions…</DropdownMenuItem>
          ) : displayedVersions.length === 0 ? (
            <DropdownMenuItem disabled>No versions available</DropdownMenuItem>
          ) : (
            <DropdownMenuRadioGroup value={currentVideoId}>
              {displayedVersions.map((version) => (
                <VersionSelectorOption
                  key={version._id}
                  version={version}
                  teamSlug={teamSlug}
                  currentVideoId={currentVideoId}
                  onSelect={onSelect}
                  canDelete={canDelete}
                  deletingVideoId={deletingVideoId}
                  onDelete={onDelete}
                />
              ))}
            </DropdownMenuRadioGroup>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {deletionPending && (
        <span className="sr-only" role="status" aria-live="polite">
          {triggerLabel}
        </span>
      )}
    </>
  );
}

export default function VideoPage() {
  const params = useParams({ strict: false });
  const navigate = useNavigate({});
  const pathname = useLocation().pathname;
  const teamSlug = typeof params.teamSlug === "string" ? params.teamSlug : "";
  const projectId = params.projectId as Id<"projects">;
  const videoId = params.videoId as Id<"videos">;
  const convex = useConvex();

  const {
    context,
    resolvedTeamSlug,
    resolvedProjectId,
    resolvedVideoId,
    video,
    versions,
    comments,
  } = useVideoData({
    teamSlug,
    projectId,
    videoId,
  });
  const flatComments = useMemo(
    () => comments?.flatMap((comment) => [comment, ...comment.replies]),
    [comments],
  );
  const updateVideo = useMutation(api.videos.update);
  const updateVideoWorkflowStatus = useMutation(api.videos.updateWorkflowStatus);
  const deleteVideo = useMutation(api.videos.remove);
  const checkMuxAssetStatus = useAction(api.videoActions.checkMuxAssetStatus);
  const retryFailedProcessing = useAction(api.videoActions.markUploadComplete);
  const getPlaybackSession = useAction(api.videoActions.getPlaybackSession);
  const getOriginalPlaybackUrl = useAction(api.videoActions.getOriginalPlaybackUrl);
  const getDownloadUrl = useAction(api.videoActions.getDownloadUrl);
  const { requestVersionUpload } = useDashboardUploadContext();

  const [currentTime, setCurrentTime] = useState(0);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [highlightedCommentId, setHighlightedCommentId] = useState<Id<"comments"> | undefined>();
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [mobileCommentsOpen, setMobileCommentsOpen] = useState(false);
  const [sidebarCollapsed, toggleSidebarCollapsed] = useSidebarCollapsed();
  const [playbackSession, setPlaybackSession] = useState<{
    url: string;
    posterUrl: string;
  } | null>(null);
  const [isLoadingPlayback, setIsLoadingPlayback] = useState(false);
  const [playbackLoadError, setPlaybackLoadError] = useState<string | null>(null);
  const [playbackRequest, setPlaybackRequest] = useState<{
    videoId: Id<"videos">;
    attempt: number;
  } | null>(null);
  const [originalPlaybackUrl, setOriginalPlaybackUrl] = useState<string | null>(null);
  const [isLoadingOriginalPlayback, setIsLoadingOriginalPlayback] = useState(false);
  const [isRetryingFailedProcessing, setIsRetryingFailedProcessing] = useState(false);
  const [retryFailedProcessingError, setRetryFailedProcessingError] = useState<string | null>(null);
  const [deletingVideoId, setDeletingVideoId] = useState<Id<"videos"> | null>(null);
  const [deleteNotice, setDeleteNotice] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const [sourcePreference, setSourcePreference] = useState<{
    videoId: Id<"videos">;
    source: DashboardPlaybackSource;
  } | null>(null);
  const [failedOriginalVideoId, setFailedOriginalVideoId] = useState<Id<"videos"> | null>(null);
  const [originalPlaybackIssue, setOriginalPlaybackIssue] = useState<{
    videoId: Id<"videos">;
    type: VideoPlaybackIssue["type"];
  } | null>(null);
  const [playbackResume, setPlaybackResume] = useState<{
    videoId: Id<"videos">;
    currentTime: number;
    wasPlaying: boolean;
  } | null>(null);
  const playerRef = useRef<VideoPlayerHandle | null>(null);
  const deletePendingRef = useRef(false);
  const muxRecoveryVideoIdRef = useRef<Id<"videos"> | null>(null);
  const playbackRetryTimeoutRef = useRef<number | null>(null);
  const isPlayable = video?.status === "ready" && Boolean(video?.muxPlaybackId);
  const playbackUrl = playbackSession?.url ?? null;
  const activePlaybackRequest =
    playbackRequest?.videoId === resolvedVideoId ? playbackRequest : null;
  const playbackRequestAttempt = activePlaybackRequest?.attempt ?? 0;
  const processingFailed = video?.status === "failed";
  const activeSourcePreference =
    sourcePreference?.videoId === resolvedVideoId ? sourcePreference : null;
  const preferredSource = activeSourcePreference?.source ?? "mux720";
  const originalPlaybackFailed = !processingFailed && failedOriginalVideoId === resolvedVideoId;
  const usableOriginalPlaybackUrl = originalPlaybackFailed ? null : originalPlaybackUrl;
  const activePlaybackUrl = processingFailed
    ? null
    : selectDashboardPlaybackUrl({
        preferredSource,
        muxPlaybackReady: isPlayable,
        muxUrl: playbackUrl,
        originalUrl: usableOriginalPlaybackUrl,
      });
  const activeQualityId =
    activePlaybackUrl && playbackUrl && activePlaybackUrl === playbackUrl ? "mux720" : "original";
  const isUsingOriginalFallback = Boolean(
    activePlaybackUrl && activePlaybackUrl === originalPlaybackUrl && !playbackUrl,
  );
  const isWaitingForMuxAfterOriginalFailure = originalPlaybackFailed && !playbackUrl;
  const activePlaybackResume = playbackResume?.videoId === resolvedVideoId ? playbackResume : null;
  const activeOriginalPlaybackIssue =
    !processingFailed && originalPlaybackIssue?.videoId === resolvedVideoId
      ? originalPlaybackIssue
      : null;
  const isAutomaticPlaybackRetryPending = Boolean(
    activeOriginalPlaybackIssue &&
    playbackLoadError &&
    playbackRequestAttempt < MAX_AUTOMATIC_PLAYBACK_ATTEMPTS - 1,
  );
  const shouldCanonicalize =
    !!context && !context.isCanonical && pathname !== context.canonicalPath;
  const prewarmTeamIntentHandlers = useRoutePrewarmIntent(() =>
    prewarmTeam(convex, { teamSlug: resolvedTeamSlug }),
  );
  const prewarmProjectIntentHandlers = useRoutePrewarmIntent(() => {
    if (!resolvedProjectId) return;
    return prewarmProject(convex, {
      teamSlug: resolvedTeamSlug,
      projectId: resolvedProjectId,
    });
  });
  const { watchers } = useVideoPresence({
    videoId: resolvedVideoId,
    enabled: Boolean(resolvedVideoId),
  });

  useEffect(() => {
    setSourcePreference(null);
    setFailedOriginalVideoId(null);
    setOriginalPlaybackIssue(null);
    setPlaybackResume(null);
    setPlaybackLoadError(null);
    setPlaybackRequest(null);
    muxRecoveryVideoIdRef.current = null;
    if (playbackRetryTimeoutRef.current !== null) {
      window.clearTimeout(playbackRetryTimeoutRef.current);
      playbackRetryTimeoutRef.current = null;
    }
  }, [resolvedVideoId]);

  useEffect(() => {
    if (video?.status !== "failed") return;
    setSourcePreference(null);
    setFailedOriginalVideoId(null);
    setOriginalPlaybackIssue(null);
    setPlaybackResume(null);
    setPlaybackLoadError(null);
    setPlaybackRequest(null);
    muxRecoveryVideoIdRef.current = null;
    if (playbackRetryTimeoutRef.current !== null) {
      window.clearTimeout(playbackRetryTimeoutRef.current);
      playbackRetryTimeoutRef.current = null;
    }
  }, [video?.status]);

  useEffect(() => {
    if (shouldCanonicalize && context) {
      navigate({ to: context.canonicalPath, replace: true });
    }
  }, [shouldCanonicalize, context, navigate]);

  useEffect(() => {
    if (!resolvedVideoId || video?.status !== "processing" || !video.muxAssetId) {
      return;
    }

    let cancelled = false;
    let timeoutId: number | undefined;

    const pollMuxStatus = async () => {
      try {
        await checkMuxAssetStatus({ videoId: resolvedVideoId });
      } catch (error) {
        console.warn("Failed to check Mux asset status", error);
      }

      if (!cancelled) {
        timeoutId = window.setTimeout(pollMuxStatus, 10_000);
      }
    };

    void pollMuxStatus();

    return () => {
      cancelled = true;
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [checkMuxAssetStatus, resolvedVideoId, video?.muxAssetId, video?.status]);

  useEffect(() => {
    if (!resolvedVideoId || !isPlayable) {
      setPlaybackSession(null);
      setIsLoadingPlayback(false);
      return;
    }

    let cancelled = false;
    setIsLoadingPlayback(true);
    setPlaybackLoadError(null);

    void getPlaybackSession({ videoId: resolvedVideoId })
      .then((session) => {
        if (cancelled) return;
        setPlaybackSession(session);
      })
      .catch(() => {
        if (cancelled) return;
        setPlaybackSession(null);
        setPlaybackLoadError("The 720p stream could not be loaded.");
        if (
          muxRecoveryVideoIdRef.current === resolvedVideoId &&
          playbackRequestAttempt < MAX_AUTOMATIC_PLAYBACK_ATTEMPTS - 1
        ) {
          playbackRetryTimeoutRef.current = window.setTimeout(
            () => {
              playbackRetryTimeoutRef.current = null;
              setPlaybackRequest((request) => ({
                videoId: resolvedVideoId,
                attempt: request?.videoId === resolvedVideoId ? request.attempt + 1 : 1,
              }));
            },
            1_000 * (playbackRequestAttempt + 1),
          );
        }
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoadingPlayback(false);
      });

    return () => {
      cancelled = true;
      if (playbackRetryTimeoutRef.current !== null) {
        window.clearTimeout(playbackRetryTimeoutRef.current);
        playbackRetryTimeoutRef.current = null;
      }
    };
  }, [
    getPlaybackSession,
    isPlayable,
    playbackRequestAttempt,
    resolvedVideoId,
    video?.muxPlaybackId,
  ]);

  useEffect(() => {
    if (!resolvedVideoId || !video || video.status === "uploading" || video.status === "failed") {
      setOriginalPlaybackUrl(null);
      setIsLoadingOriginalPlayback(false);
      return;
    }

    let cancelled = false;
    setIsLoadingOriginalPlayback(true);

    void getOriginalPlaybackUrl({ videoId: resolvedVideoId })
      .then((result) => {
        if (cancelled) return;
        setOriginalPlaybackUrl(result.url);
      })
      .catch(() => {
        if (cancelled) return;
        setOriginalPlaybackUrl(null);
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoadingOriginalPlayback(false);
      });

    return () => {
      cancelled = true;
    };
  }, [getOriginalPlaybackUrl, resolvedVideoId, video?.status, video?.s3Key]);

  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  const handleOriginalPlaybackIssue = useCallback(
    (issue: VideoPlaybackIssue) => {
      if (!resolvedVideoId) return;
      setPlaybackResume({
        videoId: resolvedVideoId,
        currentTime: issue.currentTime,
        wasPlaying: issue.wasPlaying,
      });
      muxRecoveryVideoIdRef.current = resolvedVideoId;
      setFailedOriginalVideoId(resolvedVideoId);
      setOriginalPlaybackIssue({ videoId: resolvedVideoId, type: issue.type });
      setSourcePreference({ videoId: resolvedVideoId, source: "mux720" });
      if (isPlayable && !playbackUrl && !isLoadingPlayback) {
        setPlaybackRequest((request) => ({
          videoId: resolvedVideoId,
          attempt: request?.videoId === resolvedVideoId ? request.attempt + 1 : 1,
        }));
      }
    },
    [isLoadingPlayback, isPlayable, playbackUrl, resolvedVideoId],
  );

  const handleSelectQuality = useCallback(
    (id: string) => {
      if (!resolvedVideoId || (id !== "mux720" && id !== "original")) return;
      if (id === "original") {
        muxRecoveryVideoIdRef.current = null;
        if (playbackRetryTimeoutRef.current !== null) {
          window.clearTimeout(playbackRetryTimeoutRef.current);
          playbackRetryTimeoutRef.current = null;
        }
        setFailedOriginalVideoId((failedVideoId) =>
          failedVideoId === resolvedVideoId ? null : failedVideoId,
        );
        setOriginalPlaybackIssue((issue) => (issue?.videoId === resolvedVideoId ? null : issue));
      }
      setSourcePreference({ videoId: resolvedVideoId, source: id });
    },
    [resolvedVideoId],
  );

  const handleRetryPlaybackSession = useCallback(() => {
    if (!resolvedVideoId || !isPlayable || isLoadingPlayback) return;
    muxRecoveryVideoIdRef.current = resolvedVideoId;
    setPlaybackRequest((request) => ({
      videoId: resolvedVideoId,
      attempt: request?.videoId === resolvedVideoId ? request.attempt + 1 : 1,
    }));
  }, [isLoadingPlayback, isPlayable, resolvedVideoId]);

  const handleMarkerClick = useCallback((comment: { _id: string }) => {
    setHighlightedCommentId(comment._id as Id<"comments">);
    setTimeout(() => setHighlightedCommentId(undefined), 3000);
  }, []);

  const requestDownload = useCallback(async () => {
    if (!video || video.status !== "ready" || !resolvedVideoId) return null;
    try {
      const result = await getDownloadUrl({ videoId: resolvedVideoId });
      return result;
    } catch (error) {
      console.error("Failed to prepare download:", error);
      return null;
    }
  }, [getDownloadUrl, video, resolvedVideoId]);

  const handleTimestampClick = useCallback(
    (time: number) => {
      playerRef.current?.seekTo(time);
      setHighlightedCommentId(undefined);
    },
    [playerRef, setHighlightedCommentId],
  );

  const handleExportComments = useCallback(() => {
    if (!video || !comments?.length) return;

    triggerTextDownload(buildCommentsCsv(comments), buildCommentsCsvFilename(video.title));
  }, [comments, video]);

  const handleSaveTitle = async () => {
    if (!editedTitle.trim() || !video || !resolvedVideoId) return;
    try {
      await updateVideo({ videoId: resolvedVideoId, title: editedTitle.trim() });
      setIsEditingTitle(false);
    } catch (error) {
      console.error("Failed to update title:", error);
    }
  };

  const handleUpdateWorkflowStatus = useCallback(
    async (workflowStatus: VideoWorkflowStatus) => {
      if (!resolvedVideoId) return;
      try {
        await updateVideoWorkflowStatus({ videoId: resolvedVideoId, workflowStatus });
      } catch (error) {
        console.error("Failed to update review status:", error);
      }
    },
    [resolvedVideoId, updateVideoWorkflowStatus],
  );

  const handleVersionSelected = useCallback(
    (selectedVideoId: Id<"videos">) => {
      if (!resolvedProjectId || selectedVideoId === resolvedVideoId) return;
      navigate({
        to: videoPath(resolvedTeamSlug, resolvedProjectId, selectedVideoId),
      });
    },
    [navigate, resolvedProjectId, resolvedTeamSlug, resolvedVideoId],
  );

  const handleNewVersionSelected = useCallback(
    (files: File[]) => {
      const file = files[0];
      if (!file || !resolvedVideoId || !resolvedProjectId) return;
      requestVersionUpload(
        resolvedVideoId,
        video?.versionStackId ?? resolvedVideoId,
        resolvedProjectId,
        file,
      );
    },
    [requestVersionUpload, resolvedProjectId, resolvedVideoId, video?.versionStackId],
  );

  const handleDeleteVersion = useCallback(
    async (versionToDelete: VideoVersion, animateSelectorRow = true, beforeDelete?: () => void) => {
      if (deletePendingRef.current || !resolvedVideoId || !resolvedProjectId) return;
      const isCurrentVersion = versionToDelete._id === resolvedVideoId;
      const versionChangeCopy = animateSelectorRow
        ? versionToDelete.isLatestVersion
          ? " The previous version will become latest."
          : " Later versions will be renumbered."
        : "";
      const destinationCopy = isCurrentVersion
        ? animateSelectorRow
          ? " You will be taken to the nearest remaining version."
          : " You will return to the project."
        : "";
      if (
        !window.confirm(
          `Delete ${versionToDelete.isLatestVersion ? "latest " : ""}version v${versionToDelete.versionNumber}? Its comments and share links will be deleted.${versionChangeCopy}${destinationCopy} This can't be undone.`,
        )
      ) {
        return;
      }

      beforeDelete?.();
      deletePendingRef.current = true;
      setDeletingVideoId(versionToDelete._id);
      setDeleteNotice(null);

      try {
        const requestDelete = () =>
          deleteVideo({ videoId: versionToDelete._id }).then(
            (result) => ({ ok: true as const, result }),
            (error: unknown) => ({ ok: false as const, error }),
          );
        const nonCurrentDeleteRequest = isCurrentVersion ? null : requestDelete();

        if (animateSelectorRow) {
          const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          if (!reduceMotion) {
            await new Promise<void>((resolve) => window.setTimeout(resolve, 180));
          }
        }

        const preferredReplacementVideoId =
          isCurrentVersion && animateSelectorRow
            ? findPreferredReplacementVideoId(versions, versionToDelete._id)
            : null;

        if (preferredReplacementVideoId) {
          prewarmVideo(convex, {
            teamSlug: resolvedTeamSlug,
            projectId: resolvedProjectId,
            videoId: preferredReplacementVideoId,
          });
        }

        const outcome = await (nonCurrentDeleteRequest ?? requestDelete());
        if (outcome.ok === false) {
          throw outcome.error;
        }

        const result = outcome.result;
        const successMessage = animateSelectorRow
          ? versionToDelete.isLatestVersion
            ? `Version v${versionToDelete.versionNumber} deleted. The previous version is now latest.`
            : `Version v${versionToDelete.versionNumber} deleted. Later versions were renumbered.`
          : "Video deleted. Returning to the project.";
        setDeleteNotice({
          tone: "success",
          message: successMessage,
        });

        if (isCurrentVersion) {
          if (result.replacementVideoId) {
            if (result.replacementVideoId !== preferredReplacementVideoId) {
              prewarmVideo(convex, {
                teamSlug: resolvedTeamSlug,
                projectId: resolvedProjectId,
                videoId: result.replacementVideoId,
              });
            }
            await navigate({
              to: videoPath(resolvedTeamSlug, resolvedProjectId, result.replacementVideoId),
              replace: true,
            });
          } else {
            await navigate({
              to: projectPath(resolvedTeamSlug, resolvedProjectId),
              replace: true,
            });
          }
        }
      } catch (error) {
        console.error("Failed to delete video version:", error);
        setDeleteNotice({
          tone: "error",
          message: "Couldn't delete that video version. Please try again.",
        });
      } finally {
        deletePendingRef.current = false;
        setDeletingVideoId(null);
      }
    },
    [convex, deleteVideo, navigate, resolvedProjectId, resolvedTeamSlug, resolvedVideoId, versions],
  );

  const handleRetryFailedProcessing = useCallback(async () => {
    if (!resolvedVideoId) return;

    setIsRetryingFailedProcessing(true);
    setRetryFailedProcessingError(null);
    try {
      await retryFailedProcessing({ videoId: resolvedVideoId });
    } catch (error) {
      setRetryFailedProcessingError(
        error instanceof Error ? error.message : "Failed to retry video processing.",
      );
    } finally {
      setIsRetryingFailedProcessing(false);
    }
  }, [resolvedVideoId, retryFailedProcessing]);

  const startEditingTitle = () => {
    if (video) {
      setEditedTitle(video.title);
      setIsEditingTitle(true);
    }
  };

  if (context === undefined || video === undefined || shouldCanonicalize) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-[#888]">Loading...</div>
      </div>
    );
  }

  if (context === null || video === null || !resolvedProjectId || !resolvedVideoId) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-[#888]">Video not found</div>
      </div>
    );
  }

  const canEdit = video.role !== "viewer";
  const canDelete = video.role === "owner" || video.role === "admin";
  const canComment = true;
  const showVersionSelector = (versions?.length ?? 0) > 1;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <DashboardHeader
        paths={[
          {
            label: resolvedTeamSlug,
            href: teamHomePath(resolvedTeamSlug),
            prewarmIntentHandlers: prewarmTeamIntentHandlers,
          },
          {
            label: context?.project?.name ?? "project",
            href: projectPath(resolvedTeamSlug, resolvedProjectId),
            prewarmIntentHandlers: prewarmProjectIntentHandlers,
          },
          {
            label: isEditingTitle ? (
              <div className="flex items-center gap-2">
                <Input
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="h-8 w-40 font-mono text-base font-black tracking-tighter uppercase sm:w-64"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveTitle();
                    if (e.key === "Escape") setIsEditingTitle(false);
                  }}
                />
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSaveTitle}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => setIsEditingTitle(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <ExpandableTitle title={video.title} className="max-w-[150px] sm:max-w-[300px]" />
                {canEdit && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={startEditingTitle}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                )}
                {video.status !== "ready" && (
                  <Badge variant={video.status === "failed" ? "destructive" : "secondary"}>
                    {video.status === "uploading" && "Uploading"}
                    {video.status === "processing" && "Processing"}
                    {video.status === "failed" && "Failed"}
                  </Badge>
                )}
              </div>
            ),
          },
        ]}
      >
        {/* Desktop: inline actions */}
        <div className="hidden items-center gap-3 text-xs text-[#888] 2xl:flex">
          <span className="max-w-[100px] truncate">{video.uploaderName}</span>
          {video.duration && (
            <>
              <span className="text-[#ccc]">·</span>
              <span className="font-mono">{formatDuration(video.duration)}</span>
            </>
          )}
          <VideoWatchers watchers={watchers} />
        </div>
        <div className="ml-1 hidden flex-shrink-0 items-center gap-3 border-l-2 border-[#1a1a1a]/20 pl-3 lg:flex">
          {showVersionSelector && (
            <VersionSelector
              versions={versions}
              currentVideoId={resolvedVideoId}
              currentVersionNumber={video.versionNumber}
              teamSlug={resolvedTeamSlug}
              onSelect={handleVersionSelected}
              canDelete={canDelete}
              deletingVideoId={deletingVideoId}
              onDelete={(versionToDelete, beforeDelete) =>
                void handleDeleteVersion(versionToDelete, true, beforeDelete)
              }
            />
          )}
          {canEdit && (
            <UploadButton
              multiple={false}
              variant="outline"
              onFilesSelected={handleNewVersionSelected}
            >
              <Upload className="h-4 w-4" />
              New version
            </UploadButton>
          )}
          <VideoWorkflowStatusControl
            status={video.workflowStatus}
            size="lg"
            disabled={!canEdit}
            onChange={(workflowStatus) => {
              void handleUpdateWorkflowStatus(workflowStatus);
            }}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="More video actions">
                <MoreVertical className="h-4 w-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setShareDialogOpen(true)}>
                <LinkIcon className="mr-2 h-4 w-4" />
                Share
              </DropdownMenuItem>
              <DropdownMenuItem className="xl:hidden" onSelect={() => setMobileCommentsOpen(true)}>
                <MessageSquare className="mr-2 h-4 w-4" />
                Comments{flatComments?.length ? ` (${flatComments.length})` : ""}
              </DropdownMenuItem>
              {canDelete && !showVersionSelector && (
                <DropdownMenuItem
                  className="text-[#dc2626] focus:text-[#dc2626]"
                  disabled={deletingVideoId !== null}
                  onSelect={() =>
                    void handleDeleteVersion(
                      {
                        _id: resolvedVideoId,
                        projectId: resolvedProjectId,
                        versionNumber: video.versionNumber,
                        status: video.status,
                        isLatestVersion: video.isLatestVersion,
                      },
                      false,
                    )
                  }
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {`Delete ${video.isLatestVersion ? "latest" : "current"} version (v${video.versionNumber})`}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="outline"
            size="icon"
            onClick={toggleSidebarCollapsed}
            aria-label={sidebarCollapsed ? "Show discussion sidebar" : "Hide discussion sidebar"}
            aria-controls="dashboard-discussion-sidebar"
            aria-expanded={!sidebarCollapsed}
          >
            {sidebarCollapsed ? (
              <PanelRightOpen className="h-4 w-4" aria-hidden="true" />
            ) : (
              <PanelRightClose className="h-4 w-4" aria-hidden="true" />
            )}
          </Button>
        </div>

        {/* Compact: workflow status + consolidated menu until large screens */}
        <div className="flex items-center gap-2 lg:hidden">
          {showVersionSelector && (
            <VersionSelector
              versions={versions}
              currentVideoId={resolvedVideoId}
              currentVersionNumber={video.versionNumber}
              teamSlug={resolvedTeamSlug}
              onSelect={handleVersionSelected}
              canDelete={canDelete}
              deletingVideoId={deletingVideoId}
              onDelete={(versionToDelete, beforeDelete) =>
                void handleDeleteVersion(versionToDelete, true, beforeDelete)
              }
              compact
            />
          )}
          <VideoWorkflowStatusControl
            status={video.workflowStatus}
            size="lg"
            disabled={!canEdit}
            onChange={(workflowStatus) => {
              void handleUpdateWorkflowStatus(workflowStatus);
            }}
          />
          {canEdit && (
            <UploadButton
              multiple={false}
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onFilesSelected={handleNewVersionSelected}
            >
              <Upload className="h-4 w-4" />
              <span className="sr-only">Upload new version</span>
            </UploadButton>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                aria-label="More video actions"
              >
                <MoreVertical className="h-4 w-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setShareDialogOpen(true)}>
                <LinkIcon className="mr-2 h-4 w-4" />
                Share
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setMobileCommentsOpen(true)}>
                <MessageSquare className="mr-2 h-4 w-4" />
                Comments{flatComments?.length ? ` (${flatComments.length})` : ""}
              </DropdownMenuItem>
              {canDelete && !showVersionSelector && (
                <DropdownMenuItem
                  className="text-[#dc2626] focus:text-[#dc2626]"
                  disabled={deletingVideoId !== null}
                  onSelect={() =>
                    void handleDeleteVersion(
                      {
                        _id: resolvedVideoId,
                        projectId: resolvedProjectId,
                        versionNumber: video.versionNumber,
                        status: video.status,
                        isLatestVersion: video.isLatestVersion,
                      },
                      false,
                    )
                  }
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {`Delete ${video.isLatestVersion ? "latest" : "current"} version (v${video.versionNumber})`}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </DashboardHeader>

      {/* Main content - horizontal split */}
      <div className="flex flex-1 overflow-hidden">
        {/* Video player area — full black, Frame.io style */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-black">
          {video.status === "processing" && isUsingOriginalFallback && activePlaybackUrl ? (
            <div className="flex flex-shrink-0 items-center gap-2 bg-[#171c17] px-4 py-2 text-sm text-[#e7ede4]">
              <span className="inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-[#7cb87c]" />
              <span className="font-semibold">Original playback active.</span>
              <span className="text-[#aeb9ac]">720p stream is still encoding.</span>
            </div>
          ) : null}

          {activeOriginalPlaybackIssue ? (
            <div
              className="flex flex-shrink-0 items-center gap-2 bg-[#2a2114] px-4 py-2 text-sm text-[#fff1d5]"
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[#f0b45d]" />
              <span className="font-semibold">
                {activeOriginalPlaybackIssue.type === "frozen-video"
                  ? "Original playback stalled."
                  : "Original playback was unavailable."}
              </span>
              <span className="text-[#d8c6a8]">
                {playbackUrl
                  ? "Switched to 720p."
                  : playbackLoadError && !isAutomaticPlaybackRetryPending
                    ? "720p needs another try."
                    : "Preparing 720p…"}
              </span>
            </div>
          ) : null}

          {activePlaybackUrl ? (
            <VideoPlayer
              key={resolvedVideoId}
              ref={playerRef}
              src={activePlaybackUrl}
              initialTime={activePlaybackResume?.currentTime}
              initialPlay={activePlaybackResume?.wasPlaying}
              poster={playbackSession?.posterUrl}
              comments={flatComments || []}
              onTimeUpdate={handleTimeUpdate}
              onMarkerClick={handleMarkerClick}
              allowDownload={video.status === "ready"}
              downloadFilename={`${video.title}.mp4`}
              onRequestDownload={requestDownload}
              controlsBelow
              qualityOptionsConfig={[
                {
                  id: "mux720",
                  label: playbackUrl ? "720p" : "720p (encoding...)",
                  disabled: !playbackUrl,
                },
                {
                  id: "original",
                  label: "Original",
                  disabled: !originalPlaybackUrl,
                },
              ]}
              selectedQualityId={activeQualityId}
              onSelectQuality={handleSelectQuality}
              onPlaybackIssue={
                activeQualityId === "original" ? handleOriginalPlaybackIssue : undefined
              }
            />
          ) : (
            <div className="flex flex-1 items-center justify-center">
              {isWaitingForMuxAfterOriginalFailure || (video.status === "ready" && !playbackUrl) ? (
                <div className="flex flex-col items-center gap-3 text-white">
                  {playbackLoadError && !isLoadingPlayback && !isAutomaticPlaybackRetryPending ? (
                    <>
                      <p className="text-sm font-medium text-white/85">{playbackLoadError}</p>
                      <Button variant="primary" onClick={handleRetryPlaybackSession}>
                        Retry 720p
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
                      <p className="text-sm font-medium text-white/85">
                        {isLoadingPlayback || isAutomaticPlaybackRetryPending
                          ? "Loading 720p stream..."
                          : "Preparing stream..."}
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <div className="text-center">
                  {video.status === "uploading" && <p className="text-white/60">Uploading...</p>}
                  {video.status === "processing" && (
                    <p className="text-white/60">
                      {isLoadingOriginalPlayback
                        ? "Preparing original playback..."
                        : "Processing video..."}
                    </p>
                  )}
                  {video.status === "failed" && (
                    <div className="flex max-w-md flex-col items-center gap-3 px-6">
                      <p className="font-bold text-[#f87171]">Processing failed</p>
                      {video.uploadError && (
                        <p className="text-sm text-white/60">{video.uploadError}</p>
                      )}
                      {video.isLatestVersion && showVersionSelector && (
                        <p className="text-sm text-white/60">
                          Previous versions are still available from the version menu.
                        </p>
                      )}
                      {canEdit && video.s3Key && (
                        <Button
                          variant="outline"
                          onClick={() => void handleRetryFailedProcessing()}
                          disabled={isRetryingFailedProcessing}
                        >
                          {isRetryingFailedProcessing && (
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                          )}
                          Retry processing
                        </Button>
                      )}
                      {retryFailedProcessingError && (
                        <p className="text-sm text-[#f87171]">{retryFailedProcessingError}</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Comments sidebar — desktop */}
        <aside
          id="dashboard-discussion-sidebar"
          className={cn(
            "hidden w-80 flex-col border-l-2 border-[#1a1a1a] bg-[#f0f0e8] transition-[margin] duration-300 motion-reduce:transition-none lg:flex xl:w-96",
            sidebarCollapsed && "pointer-events-none -mr-80 xl:-mr-96",
          )}
          aria-hidden={sidebarCollapsed}
          inert={sidebarCollapsed}
        >
          <div className="flex flex-shrink-0 items-center justify-between border-b border-[#1a1a1a]/10 px-5 py-4 dark:border-white/10">
            <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-[#1a1a1a] dark:text-[#f0f0e8]">
              Discussion
            </h2>
            <div className="flex items-center gap-2">
              {flatComments && flatComments.length > 0 && (
                <span className="rounded-full bg-[#1a1a1a]/5 px-2 py-0.5 text-[11px] font-medium text-[#888] dark:bg-white/5">
                  {flatComments.length} {flatComments.length === 1 ? "comment" : "comments"}
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-[10px]"
                onClick={handleExportComments}
                disabled={!comments?.length}
              >
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <CommentList
              comments={comments}
              onTimestampClick={handleTimestampClick}
              highlightedCommentId={highlightedCommentId}
              canResolve={canEdit}
            />
          </div>
          {canComment && (
            <div className="flex-shrink-0 border-t-2 border-[#1a1a1a] bg-[#f0f0e8]">
              <CommentInput
                videoId={resolvedVideoId}
                timestampSeconds={currentTime}
                showTimestamp
                variant="seamless"
              />
            </div>
          )}
        </aside>
      </div>

      {/* Comments overlay — mobile */}
      {mobileCommentsOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#f0f0e8] lg:hidden">
          <div className="flex flex-shrink-0 items-center justify-between border-b-2 border-[#1a1a1a] px-5 py-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-[#1a1a1a]">
              Discussion
              {flatComments && flatComments.length > 0 && (
                <span className="rounded-full bg-[#1a1a1a]/5 px-2 py-0.5 text-[11px] font-medium text-[#888]">
                  {flatComments.length}
                </span>
              )}
            </h2>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-[10px]"
                onClick={handleExportComments}
                disabled={!comments?.length}
              >
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setMobileCommentsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <CommentList
              comments={comments}
              onTimestampClick={(time) => {
                handleTimestampClick(time);
                setMobileCommentsOpen(false);
              }}
              highlightedCommentId={highlightedCommentId}
              canResolve={canEdit}
            />
          </div>
          {canComment && (
            <div className="flex-shrink-0 border-t-2 border-[#1a1a1a] bg-[#f0f0e8]">
              <CommentInput
                videoId={resolvedVideoId}
                timestampSeconds={currentTime}
                showTimestamp
                variant="seamless"
              />
            </div>
          )}
        </div>
      )}

      <ShareDialog
        videoId={resolvedVideoId}
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
      />
      {deleteNotice ? (
        <div
          className={cn(
            "fixed top-4 right-4 z-50 flex items-center gap-3 border-2 px-3 py-2 text-sm font-bold shadow-[4px_4px_0px_0px_var(--shadow-color)]",
            deleteNotice.tone === "error"
              ? "border-[#dc2626] bg-[#fef2f2] text-[#dc2626]"
              : "border-[#1a1a1a] bg-[#f0f0e8] text-[#1a1a1a]",
          )}
          role={deleteNotice.tone === "error" ? "alert" : "status"}
          aria-live={deleteNotice.tone === "error" ? "assertive" : "polite"}
          aria-atomic="true"
        >
          <span>{deleteNotice.message}</span>
          <button
            type="button"
            onClick={() => setDeleteNotice(null)}
            className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center"
            aria-label="Dismiss deletion notice"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
