import { useConvex, useMutation, useAction } from "convex/react";
import { api } from "@convex/_generated/api";
import { useLocation, useNavigate, useParams } from "@tanstack/react-router";
import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { VideoPlayer, type VideoPlayerHandle } from "@/components/video-player/VideoPlayer";
import { CommentList } from "@/components/comments/CommentList";
import { CommentInput } from "@/components/comments/CommentInput";
import { ShareDialog } from "@/components/ShareDialog";
import {
  VideoWorkflowStatusControl,
  type VideoWorkflowStatus,
} from "@/components/videos/VideoWorkflowStatusControl";
import { formatDuration } from "@/lib/utils";
import { buildCommentsCsv, buildCommentsCsvFilename } from "@/lib/commentCsv";
import { triggerTextDownload } from "@/lib/download";
import { useVideoPresence } from "@/lib/useVideoPresence";
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
import { useRoutePrewarmIntent } from "@/lib/useRoutePrewarmIntent";
import { prewarmProject } from "./-project.data";
import { prewarmTeam } from "./-team.data";
import { prewarmVideo, useVideoData } from "./-video.data";

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

function VersionSelectorOption({
  version,
  teamSlug,
  currentVideoId,
  onSelect,
}: {
  version: {
    _id: Id<"videos">;
    projectId: Id<"projects">;
    versionNumber: number;
    status: string;
    isLatestVersion: boolean;
  };
  teamSlug: string;
  currentVideoId: Id<"videos">;
  onSelect: (videoId: Id<"videos">) => void;
}) {
  const convex = useConvex();
  const prewarmIntentHandlers = useRoutePrewarmIntent(() =>
    prewarmVideo(convex, {
      teamSlug,
      projectId: version.projectId,
      videoId: version._id,
    }),
  );

  return (
    <DropdownMenuRadioItem
      value={version._id}
      onSelect={() => onSelect(version._id)}
      {...prewarmIntentHandlers}
    >
      <span className="font-bold">v{version.versionNumber}</span>
      <span className="ml-2 text-xs text-[#888]">
        {version._id === currentVideoId
          ? `${version.isLatestVersion ? "Viewing latest" : "Viewing"} · ${versionStatusLabel(version.status)}`
          : version.isLatestVersion
            ? `Latest · ${versionStatusLabel(version.status)}`
            : versionStatusLabel(version.status)}
      </span>
    </DropdownMenuRadioItem>
  );
}

function VersionSelector({
  versions,
  currentVideoId,
  currentVersionNumber,
  teamSlug,
  onSelect,
  compact = false,
}: {
  versions:
    | Array<{
        _id: Id<"videos">;
        projectId: Id<"projects">;
        versionNumber: number;
        status: string;
        isLatestVersion: boolean;
      }>
    | undefined;
  currentVideoId: Id<"videos">;
  currentVersionNumber: number;
  teamSlug: string;
  onSelect: (videoId: Id<"videos">) => void;
  compact?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size={compact ? "icon" : "default"}
          className={compact ? "h-8 w-8" : undefined}
          aria-label={`Select video version, currently v${currentVersionNumber}`}
        >
          {versions === undefined ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Layers3 className="h-4 w-4" aria-hidden="true" />
          )}
          {!compact && <span>v{currentVersionNumber}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52">
        <DropdownMenuLabel>Video versions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {versions === undefined ? (
          <DropdownMenuItem disabled>Loading versions…</DropdownMenuItem>
        ) : versions.length === 0 ? (
          <DropdownMenuItem disabled>No versions available</DropdownMenuItem>
        ) : (
          <DropdownMenuRadioGroup value={currentVideoId}>
            {versions.map((version) => (
              <VersionSelectorOption
                key={version._id}
                version={version}
                teamSlug={teamSlug}
                currentVideoId={currentVideoId}
                onSelect={onSelect}
              />
            ))}
          </DropdownMenuRadioGroup>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
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
    commentsThreaded,
  } = useVideoData({
    teamSlug,
    projectId,
    videoId,
  });
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
  const [playbackSession, setPlaybackSession] = useState<{
    url: string;
    posterUrl: string;
  } | null>(null);
  const [isLoadingPlayback, setIsLoadingPlayback] = useState(false);
  const [originalPlaybackUrl, setOriginalPlaybackUrl] = useState<string | null>(null);
  const [isLoadingOriginalPlayback, setIsLoadingOriginalPlayback] = useState(false);
  const [isRetryingFailedProcessing, setIsRetryingFailedProcessing] = useState(false);
  const [retryFailedProcessingError, setRetryFailedProcessingError] = useState<string | null>(null);
  const [preferredSource, setPreferredSource] = useState<"mux720" | "original">("original");
  const playerRef = useRef<VideoPlayerHandle | null>(null);
  const isPlayable = video?.status === "ready" && Boolean(video?.muxPlaybackId);
  const playbackUrl = playbackSession?.url ?? null;
  const activePlaybackUrl =
    preferredSource === "mux720"
      ? (playbackUrl ?? originalPlaybackUrl)
      : (originalPlaybackUrl ?? playbackUrl);
  const activeQualityId =
    activePlaybackUrl && playbackUrl && activePlaybackUrl === playbackUrl ? "mux720" : "original";
  const isUsingOriginalFallback = Boolean(
    activePlaybackUrl && activePlaybackUrl === originalPlaybackUrl && !playbackUrl,
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

    void getPlaybackSession({ videoId: resolvedVideoId })
      .then((session) => {
        if (cancelled) return;
        setPlaybackSession(session);
      })
      .catch(() => {
        if (cancelled) return;
        setPlaybackSession(null);
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoadingPlayback(false);
      });

    return () => {
      cancelled = true;
    };
  }, [getPlaybackSession, isPlayable, resolvedVideoId, video?.muxPlaybackId]);

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
    if (!video || !commentsThreaded?.length) return;

    triggerTextDownload(buildCommentsCsv(commentsThreaded), buildCommentsCsvFilename(video.title));
  }, [commentsThreaded, video]);

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

  const handleDeleteVersion = useCallback(async () => {
    if (!video || !resolvedVideoId || !resolvedProjectId) return;
    if (
      !window.confirm(
        `Delete ${video.isLatestVersion ? "the latest" : "the current"} version (v${video.versionNumber})? Its comments and share links will be deleted.${video.isLatestVersion ? " The previous version will become latest." : ""}`,
      )
    ) {
      return;
    }

    try {
      const result = await deleteVideo({ videoId: resolvedVideoId });
      if (result.replacementVideoId) {
        navigate({
          to: videoPath(resolvedTeamSlug, resolvedProjectId, result.replacementVideoId),
          replace: true,
        });
      } else {
        navigate({
          to: projectPath(resolvedTeamSlug, resolvedProjectId),
          replace: true,
        });
      }
    } catch (error) {
      console.error("Failed to delete video version:", error);
    }
  }, [deleteVideo, navigate, resolvedProjectId, resolvedTeamSlug, resolvedVideoId, video]);

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
                <span className="max-w-[150px] truncate sm:max-w-[300px]">{video.title}</span>
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
                Comments{comments && comments.length > 0 ? ` (${comments.length})` : ""}
              </DropdownMenuItem>
              {canDelete && (
                <DropdownMenuItem
                  className="text-[#dc2626] focus:text-[#dc2626]"
                  onSelect={() => void handleDeleteVersion()}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {`Delete ${video.isLatestVersion ? "latest" : "current"} version (v${video.versionNumber})`}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
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
                Comments{comments && comments.length > 0 ? ` (${comments.length})` : ""}
              </DropdownMenuItem>
              {canDelete && (
                <DropdownMenuItem
                  className="text-[#dc2626] focus:text-[#dc2626]"
                  onSelect={() => void handleDeleteVersion()}
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

          {activePlaybackUrl ? (
            <VideoPlayer
              ref={playerRef}
              src={activePlaybackUrl}
              poster={playbackSession?.posterUrl}
              comments={comments || []}
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
              onSelectQuality={(id) => {
                if (id === "mux720" || id === "original") {
                  setPreferredSource(id);
                }
              }}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center">
              {video.status === "ready" && !playbackUrl ? (
                <div className="flex flex-col items-center gap-3 text-white">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
                  <p className="text-sm font-medium text-white/85">
                    {isLoadingPlayback ? "Loading stream..." : "Preparing stream..."}
                  </p>
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
        <aside className="hidden w-80 flex-col border-l-2 border-[#1a1a1a] bg-[#f0f0e8] lg:flex xl:w-96">
          <div className="flex flex-shrink-0 items-center justify-between border-b border-[#1a1a1a]/10 px-5 py-4 dark:border-white/10">
            <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-[#1a1a1a] dark:text-[#f0f0e8]">
              Discussion
            </h2>
            <div className="flex items-center gap-2">
              {comments && comments.length > 0 && (
                <span className="rounded-full bg-[#1a1a1a]/5 px-2 py-0.5 text-[11px] font-medium text-[#888] dark:bg-white/5">
                  {comments.length} {comments.length === 1 ? "comment" : "comments"}
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-[10px]"
                onClick={handleExportComments}
                disabled={!commentsThreaded?.length}
              >
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <CommentList
              videoId={resolvedVideoId}
              comments={commentsThreaded}
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
              {comments && comments.length > 0 && (
                <span className="rounded-full bg-[#1a1a1a]/5 px-2 py-0.5 text-[11px] font-medium text-[#888]">
                  {comments.length}
                </span>
              )}
            </h2>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-[10px]"
                onClick={handleExportComments}
                disabled={!commentsThreaded?.length}
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
              videoId={resolvedVideoId}
              comments={commentsThreaded}
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
    </div>
  );
}
