
import { useConvex, useMutation, useAction } from "convex/react";
import { api } from "@convex/_generated/api";
import { Link, useLocation, useNavigate, useParams } from "@tanstack/react-router";
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
import { formatDuration, formatTimestamp } from "@/lib/utils";
import { useVideoPresence } from "@/lib/useVideoPresence";
import { VideoWatchers } from "@/components/presence/VideoWatchers";
import {
  ArrowLeft,
  Edit2,
  Check,
  X,
  Link as LinkIcon,
  MessageSquare,
} from "lucide-react";
import { Id } from "@convex/_generated/dataModel";
import { projectPath } from "@/lib/routes";
import { useRoutePrewarmIntent } from "@/lib/useRoutePrewarmIntent";
import { prewarmProject } from "./-project.data";
import { useVideoData } from "./-video.data";

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
    comments,
    commentsThreaded,
  } = useVideoData({
    teamSlug,
    projectId,
    videoId,
  });
  const updateVideo = useMutation(api.videos.update);
  const updateVideoWorkflowStatus = useMutation(api.videos.updateWorkflowStatus);
  const getPlaybackSession = useAction(api.videoActions.getPlaybackSession);
  const getDownloadUrl = useAction(api.videoActions.getDownloadUrl);

  const [currentTime, setCurrentTime] = useState(0);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [highlightedCommentId, setHighlightedCommentId] = useState<Id<"comments"> | undefined>();
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [commentTimestamp, setCommentTimestamp] = useState(0);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [playbackSession, setPlaybackSession] = useState<{
    url: string;
    posterUrl: string;
  } | null>(null);
  const [isLoadingPlayback, setIsLoadingPlayback] = useState(false);
  const playerRef = useRef<VideoPlayerHandle | null>(null);
  const isPlayable = video?.status === "ready" && Boolean(video?.muxPlaybackId);
  const playbackUrl = playbackSession?.url ?? null;
  const shouldCanonicalize =
    !!context && !context.isCanonical && pathname !== context.canonicalPath;
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
    [playerRef, setHighlightedCommentId]
  );

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

  const startEditingTitle = () => {
    if (video) {
      setEditedTitle(video.title);
      setIsEditingTitle(true);
    }
  };

  if (context === undefined || video === undefined || shouldCanonicalize) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-[#888]">Loading...</div>
      </div>
    );
  }

  if (context === null || video === null || !resolvedProjectId || !resolvedVideoId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-[#888]">Video not found</div>
      </div>
    );
  }

  const canEdit = video.role !== "viewer";
  const canComment = true;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="flex-shrink-0 border-b-2 border-[#1a1a1a] px-6 py-4">
        <Link
          to={projectPath(resolvedTeamSlug, resolvedProjectId)}
          preload="intent"
          className="inline-flex items-center text-sm text-[#888] hover:text-[#1a1a1a] transition-colors mb-3"
          {...prewarmProjectIntentHandlers}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Videos
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {isEditingTitle ? (
              <div className="flex items-center gap-2">
                <Input
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="w-64"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveTitle();
                    if (e.key === "Escape") setIsEditingTitle(false);
                  }}
                />
                <Button size="icon" variant="ghost" onClick={handleSaveTitle}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setIsEditingTitle(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <h1 className="text-xl font-black text-[#1a1a1a]">{video.title}</h1>
                {canEdit && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={startEditingTitle}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                )}
              </>
            )}
            {video.status !== "ready" && (
              <Badge
                variant={video.status === "failed" ? "destructive" : "secondary"}
              >
                {video.status === "uploading" && "Uploading"}
                {video.status === "processing" && "Processing"}
                {video.status === "failed" && "Failed"}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4 flex-wrap justify-end">
            <VideoWorkflowStatusControl
              status={video.workflowStatus}
              size="lg"
              onChange={(workflowStatus) => {
                void handleUpdateWorkflowStatus(workflowStatus);
              }}
            />
            <Button variant="outline" onClick={() => setShareDialogOpen(true)}>
              <LinkIcon className="mr-1.5 h-4 w-4" />
              Share
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-2 text-sm text-[#888]">
          <span>{video.uploaderName}</span>
          {video.duration && (
            <>
              <span className="text-[#ccc]">·</span>
              <span className="font-mono text-xs">{formatDuration(video.duration)}</span>
            </>
          )}
          {comments && comments.length > 0 && (
            <>
              <span className="text-[#ccc]">·</span>
              <span>{comments.length} comments</span>
            </>
          )}
          <VideoWatchers watchers={watchers} className="ml-auto" />
        </div>
      </header>

      {/* Main content - horizontal split */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video player area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="flex-1 p-6 overflow-auto">
            {video.status === "ready" && playbackUrl ? (
              <div className="h-full flex flex-col">
                <div className="flex-1 flex items-center justify-center">
                  <div className="w-full max-w-6xl">
                    <VideoPlayer
                      ref={playerRef}
                      src={playbackUrl}
                      poster={playbackSession?.posterUrl}
                      comments={comments || []}
                      onTimeUpdate={handleTimeUpdate}
                      onMarkerClick={handleMarkerClick}
                      allowDownload={video.status === "ready"}
                      downloadFilename={`${video.title}.mp4`}
                      onRequestDownload={requestDownload}
                    />
                  </div>
                </div>

                {/* Comment controls */}
                <div className="flex-shrink-0 pt-4">
                  {showCommentInput && canComment ? (
                    <div className="max-w-6xl mx-auto p-4 bg-[#e8e8e0] border-2 border-[#1a1a1a]">
                      <CommentInput
                        videoId={resolvedVideoId}
                        timestampSeconds={commentTimestamp}
                        showTimestamp
                        autoFocus
                        onSubmit={() => setShowCommentInput(false)}
                        onCancel={() => setShowCommentInput(false)}
                      />
                    </div>
                  ) : canComment ? (
                    <div className="max-w-6xl mx-auto">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setCommentTimestamp(currentTime);
                          setShowCommentInput(true);
                        }}
                      >
                        <MessageSquare className="mr-1.5 h-4 w-4" />
                        Comment at {formatTimestamp(currentTime)}
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                {video.status === "ready" && !playbackUrl ? (
                  <div className="w-full max-w-6xl">
                    <div className="relative aspect-video overflow-hidden rounded-xl border border-zinc-800/80 bg-black shadow-[0_10px_40px_rgba(0,0,0,0.45)]">
                      {playbackSession?.posterUrl || video.thumbnailUrl?.startsWith("http") ? (
                        <img
                          src={playbackSession?.posterUrl ?? video.thumbnailUrl}
                          alt={`${video.title} thumbnail`}
                          className="h-full w-full object-cover blur-[4px]"
                        />
                      ) : null}
                      <div className="absolute inset-0 bg-black/45" />
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
                        <p className="text-sm font-medium text-white/85">
                          {isLoadingPlayback ? "Loading stream..." : "Preparing stream..."}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="max-w-2xl w-full aspect-video bg-[#e8e8e0] flex items-center justify-center border-2 border-[#1a1a1a]">
                    <div className="text-center">
                      {video.status === "uploading" && (
                        <p className="text-[#888]">Uploading...</p>
                      )}
                      {video.status === "processing" && (
                        <p className="text-[#888]">Processing video...</p>
                      )}
                      {video.status === "failed" && (
                        <p className="text-[#dc2626]">Processing failed</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Comments sidebar */}
        <aside className="w-80 xl:w-96 border-l-2 border-[#1a1a1a] flex flex-col bg-[#f0f0e8]">
          <div className="flex-shrink-0 px-4 py-3 border-b-2 border-[#1a1a1a]">
            <h2 className="font-bold text-[#1a1a1a] flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-[#888]" />
              Comments
              {comments && comments.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {comments.length}
                </Badge>
              )}
            </h2>
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
        </aside>
      </div>

      <ShareDialog
        videoId={resolvedVideoId}
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
      />
    </div>
  );
}
