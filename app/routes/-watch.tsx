import { useAction, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useUser } from "@clerk/tanstack-react-start";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { VideoPlayer, type VideoPlayerHandle } from "@/components/video-player/VideoPlayer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CommentText } from "@/components/comments/CommentText";
import { triggerDownload } from "@/lib/download";
import { watchPath } from "@/lib/routes";
import { cn, formatDuration, formatTimestamp, formatRelativeTime } from "@/lib/utils";
import {
  AlertCircle,
  Layers3,
  MessageSquare,
  Clock,
  Download,
  PanelRightClose,
  PanelRightOpen,
  X,
} from "lucide-react";
import { useSidebarCollapsed } from "@/lib/useSidebarCollapsed";
import { useWatchData } from "./-watch.data";

export default function WatchPage() {
  const params = useParams({ strict: false });
  const publicId = params.publicId as string;
  const navigate = useNavigate();
  const { user, isLoaded: isUserLoaded } = useUser();

  const createComment = useMutation(api.comments.createForPublic);
  const getPlaybackSession = useAction(api.videoActions.getPublicPlaybackSession);
  const getDownloadUrl = useAction(api.videoActions.getPublicDownloadUrl);

  const { videoData, versions, comments } = useWatchData({ publicId });
  const [playbackSession, setPlaybackSession] = useState<{
    url: string;
    posterUrl: string;
  } | null>(null);
  const [isLoadingPlayback, setIsLoadingPlayback] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [commentText, setCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [mobileCommentsOpen, setMobileCommentsOpen] = useState(false);
  const [sidebarCollapsed, toggleSidebarCollapsed] = useSidebarCollapsed();
  const playerRef = useRef<VideoPlayerHandle | null>(null);

  useEffect(() => {
    if (!videoData?.video?.muxPlaybackId) {
      setPlaybackSession(null);
      return;
    }

    let cancelled = false;
    setIsLoadingPlayback(true);
    setPlaybackError(null);

    void getPlaybackSession({ publicId })
      .then((session) => {
        if (cancelled) return;
        setPlaybackSession(session);
      })
      .catch(() => {
        if (cancelled) return;
        setPlaybackError("Unable to load playback session.");
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoadingPlayback(false);
      });

    return () => {
      cancelled = true;
    };
  }, [getPlaybackSession, publicId, videoData?.video?.muxPlaybackId]);

  useEffect(() => {
    setIsDownloading(false);
    setDownloadError(null);
  }, [publicId]);

  const flattenedComments = useMemo(() => {
    if (!comments) return [] as Array<{ _id: string; timestampSeconds: number; resolved: boolean }>;

    const markers: Array<{ _id: string; timestampSeconds: number; resolved: boolean }> = [];
    for (const comment of comments) {
      markers.push({
        _id: comment._id,
        timestampSeconds: comment.timestampSeconds,
        resolved: comment.resolved,
      });
      for (const reply of comment.replies) {
        markers.push({
          _id: reply._id,
          timestampSeconds: reply.timestampSeconds,
          resolved: reply.resolved,
        });
      }
    }
    return markers;
  }, [comments]);

  const handleSubmitComment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!commentText.trim() || isSubmittingComment) return;

    setIsSubmittingComment(true);
    setCommentError(null);
    try {
      await createComment({
        publicId,
        text: commentText.trim(),
        timestampSeconds: currentTime,
      });
      setCommentText("");
    } catch {
      setCommentError("Failed to post comment.");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDownload = useCallback(async () => {
    if (isDownloading) return;

    setDownloadError(null);
    setIsDownloading(true);
    try {
      const result = await getDownloadUrl({ publicId });
      triggerDownload(result.url, result.filename);
    } catch (error) {
      console.error("Failed to prepare public download:", error);
      setDownloadError(
        error instanceof Error ? error.message : "Unable to prepare this download right now.",
      );
    } finally {
      setIsDownloading(false);
    }
  }, [getDownloadUrl, isDownloading, publicId]);

  if (videoData === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f0f0e8]">
        <div className="text-[#888]">Loading...</div>
      </div>
    );
  }

  if (videoData?.processing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f0f0e8] p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center border-2 border-[#1a1a1a]">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#1a1a1a]/20 border-t-[#1a1a1a]" />
            </div>
            <CardTitle>Processing video</CardTitle>
            <CardDescription>
              {videoData.title ? `“${videoData.title}” is` : "This video is"} still processing and
              will be ready to watch shortly. This page updates automatically.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!videoData?.video) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f0f0e8] p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center border-2 border-[#dc2626] bg-[#dc2626]/10">
              <AlertCircle className="h-6 w-6 text-[#dc2626]" />
            </div>
            <CardTitle>Video unavailable</CardTitle>
            <CardDescription>
              This video is private, invalid, or no longer available.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/" preload="intent" className="block">
              <Button variant="outline" className="w-full">
                Go to lawn
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const video = videoData.video;

  return (
    <div className="flex h-[100dvh] flex-col bg-[#f0f0e8]">
      {/* Header */}
      <header className="flex flex-shrink-0 items-center justify-between border-b-2 border-[#1a1a1a] bg-[#f0f0e8] px-5 py-3">
        <div className="flex items-center gap-4">
          <Link
            preload="intent"
            to="/"
            className="flex items-center gap-2 text-sm font-bold text-[#888] hover:text-[#1a1a1a]"
          >
            lawn
          </Link>
          <div className="h-4 w-[2px] bg-[#1a1a1a]/20" />
          <h1 className="max-w-[150px] truncate text-base font-black sm:max-w-[300px]">
            {video.title}
          </h1>
        </div>
        <div className="flex items-center gap-3 text-xs text-[#888]">
          {video.duration && (
            <>
              <span className="hidden text-[#ccc] sm:inline">·</span>
              <span className="hidden font-mono sm:inline">{formatDuration(video.duration)}</span>
            </>
          )}
          {versions && versions.length > 1 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  aria-label={`Select version, currently v${video.versionNumber}`}
                >
                  <Layers3 className="h-4 w-4" />
                  <span className="hidden font-mono sm:inline">v{video.versionNumber}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-44">
                <DropdownMenuLabel>Versions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={video.publicId}>
                  {versions.map((version) => (
                    <DropdownMenuRadioItem
                      key={version.publicId}
                      value={version.publicId}
                      onSelect={() => {
                        if (version.publicId !== video.publicId) {
                          void navigate({ to: watchPath(version.publicId) });
                        }
                      }}
                    >
                      <span className="font-mono font-bold">v{version.versionNumber}</span>
                      {version.isLatest && <span className="ml-2 text-xs text-[#888]">Latest</span>}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => void handleDownload()}
            disabled={isDownloading}
            aria-label={isDownloading ? "Preparing download" : "Download video"}
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">{isDownloading ? "Preparing..." : "Download"}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 lg:hidden"
            onClick={() => setMobileCommentsOpen(true)}
          >
            <MessageSquare className="h-4 w-4" />
            {comments && comments.length > 0 && (
              <span className="ml-1.5 text-xs">{comments.length}</span>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="hidden h-8 lg:inline-flex"
            onClick={toggleSidebarCollapsed}
            aria-label={sidebarCollapsed ? "Show discussion sidebar" : "Hide discussion sidebar"}
            aria-controls="public-discussion-sidebar"
            aria-expanded={!sidebarCollapsed}
          >
            {sidebarCollapsed ? (
              <PanelRightOpen className="h-4 w-4" aria-hidden="true" />
            ) : (
              <PanelRightClose className="h-4 w-4" aria-hidden="true" />
            )}
          </Button>
        </div>
      </header>

      {/* Main content - horizontal split */}
      <div className="flex flex-1 overflow-hidden">
        {/* Video player area */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-black">
          {downloadError ? (
            <div
              role="alert"
              aria-live="assertive"
              aria-atomic="true"
              className="border-b border-[#dc2626]/40 bg-[#f8d7d7] px-5 py-3 text-sm text-[#7f1d1d]"
            >
              {downloadError}
            </div>
          ) : null}

          {playbackSession?.url ? (
            <VideoPlayer
              ref={playerRef}
              src={playbackSession.url}
              poster={playbackSession.posterUrl}
              comments={flattenedComments}
              onTimeUpdate={setCurrentTime}
              allowDownload={false}
              controlsBelow
            />
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-white">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
                <p className="text-sm font-medium text-white/85">
                  {playbackError ??
                    (isLoadingPlayback ? "Loading stream..." : "Preparing stream...")}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Comments sidebar — desktop */}
        <aside
          id="public-discussion-sidebar"
          className={cn(
            "hidden w-80 flex-col border-l-2 border-[#1a1a1a] bg-[#f0f0e8] transition-[margin] duration-300 motion-reduce:transition-none lg:flex xl:w-96",
            sidebarCollapsed && "pointer-events-none -mr-80 xl:-mr-96",
          )}
          aria-hidden={sidebarCollapsed}
          inert={sidebarCollapsed}
        >
          <div className="flex flex-shrink-0 items-center justify-between border-b border-[#1a1a1a]/10 px-5 py-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-[#1a1a1a]">
              Discussion
            </h2>
            {comments && comments.length > 0 && (
              <span className="rounded-full bg-[#1a1a1a]/5 px-2 py-0.5 text-[11px] font-medium text-[#888]">
                {comments.length} {comments.length === 1 ? "comment" : "comments"}
              </span>
            )}
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {comments === undefined ? (
              <p className="text-sm text-[#888]">Loading comments...</p>
            ) : comments.length === 0 ? (
              <p className="text-sm text-[#888]">No comments yet.</p>
            ) : (
              <div className="space-y-3">
                {comments.map((comment) => (
                  <article key={comment._id} className="border-2 border-[#1a1a1a] bg-[#f0f0e8] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-bold text-[#1a1a1a]">{comment.userName}</div>
                      <button
                        type="button"
                        className="font-mono text-xs text-[#2d5a2d] hover:text-[#1a1a1a]"
                        onClick={() =>
                          playerRef.current?.seekTo(comment.timestampSeconds, { play: true })
                        }
                      >
                        {formatTimestamp(comment.timestampSeconds)}
                      </button>
                    </div>
                    <p className="mt-1 text-sm break-words whitespace-pre-wrap text-[#1a1a1a]">
                      <CommentText text={comment.text} />
                    </p>
                    <p className="mt-1 text-[11px] text-[#888]">
                      {formatRelativeTime(comment._creationTime)}
                    </p>

                    {comment.replies.length > 0 ? (
                      <div className="mt-3 ml-4 space-y-2 border-l-2 border-[#1a1a1a] pl-3">
                        {comment.replies.map((reply) => (
                          <div key={reply._id} className="text-sm">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-[#1a1a1a]">{reply.userName}</span>
                              <button
                                type="button"
                                className="font-mono text-xs text-[#2d5a2d] hover:text-[#1a1a1a]"
                                onClick={() =>
                                  playerRef.current?.seekTo(reply.timestampSeconds, {
                                    play: true,
                                  })
                                }
                              >
                                {formatTimestamp(reply.timestampSeconds)}
                              </button>
                            </div>
                            <p className="break-words whitespace-pre-wrap text-[#1a1a1a]">
                              <CommentText text={reply.text} />
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </div>

          <div className="flex-shrink-0 border-t-2 border-[#1a1a1a] bg-[#f0f0e8] p-4">
            {isUserLoaded && user ? (
              <form onSubmit={handleSubmitComment} className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-[#666]">
                  <Clock className="h-3.5 w-3.5" />
                  Comment at {formatTimestamp(currentTime)}
                </div>
                <Textarea
                  value={commentText}
                  onChange={(event) => setCommentText(event.target.value)}
                  placeholder="Leave a comment..."
                  className="min-h-[90px] text-sm"
                />
                {commentError ? <p className="text-xs text-[#dc2626]">{commentError}</p> : null}
                <Button
                  type="submit"
                  size="sm"
                  disabled={!commentText.trim() || isSubmittingComment}
                  className="w-full"
                >
                  <MessageSquare className="mr-1.5 h-4 w-4" />
                  {isSubmittingComment ? "Posting..." : "Post comment"}
                </Button>
              </form>
            ) : (
              <a
                href={`/sign-in?redirect_url=${encodeURIComponent(`/watch/${publicId}`)}`}
                className="block"
              >
                <Button className="w-full">
                  <MessageSquare className="mr-1.5 h-4 w-4" />
                  Sign in to comment
                </Button>
              </a>
            )}
          </div>
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
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setMobileCommentsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {comments === undefined ? (
              <p className="text-sm text-[#888]">Loading comments...</p>
            ) : comments.length === 0 ? (
              <p className="text-sm text-[#888]">No comments yet.</p>
            ) : (
              <div className="space-y-3">
                {comments.map((comment) => (
                  <article key={comment._id} className="border-2 border-[#1a1a1a] bg-[#f0f0e8] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-bold text-[#1a1a1a]">{comment.userName}</div>
                      <button
                        type="button"
                        className="font-mono text-xs text-[#2d5a2d] hover:text-[#1a1a1a]"
                        onClick={() => {
                          playerRef.current?.seekTo(comment.timestampSeconds, { play: true });
                          setMobileCommentsOpen(false);
                        }}
                      >
                        {formatTimestamp(comment.timestampSeconds)}
                      </button>
                    </div>
                    <p className="mt-1 text-sm break-words whitespace-pre-wrap text-[#1a1a1a]">
                      <CommentText text={comment.text} />
                    </p>
                    <p className="mt-1 text-[11px] text-[#888]">
                      {formatRelativeTime(comment._creationTime)}
                    </p>

                    {comment.replies.length > 0 ? (
                      <div className="mt-3 ml-4 space-y-2 border-l-2 border-[#1a1a1a] pl-3">
                        {comment.replies.map((reply) => (
                          <div key={reply._id} className="text-sm">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-[#1a1a1a]">{reply.userName}</span>
                              <button
                                type="button"
                                className="font-mono text-xs text-[#2d5a2d] hover:text-[#1a1a1a]"
                                onClick={() => {
                                  playerRef.current?.seekTo(reply.timestampSeconds, { play: true });
                                  setMobileCommentsOpen(false);
                                }}
                              >
                                {formatTimestamp(reply.timestampSeconds)}
                              </button>
                            </div>
                            <p className="break-words whitespace-pre-wrap text-[#1a1a1a]">
                              <CommentText text={reply.text} />
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </div>

          <div className="pb-safe flex-shrink-0 border-t-2 border-[#1a1a1a] bg-[#f0f0e8] p-4">
            {isUserLoaded && user ? (
              <form onSubmit={handleSubmitComment} className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-[#666]">
                  <Clock className="h-3.5 w-3.5" />
                  Comment at {formatTimestamp(currentTime)}
                </div>
                <Textarea
                  value={commentText}
                  onChange={(event) => setCommentText(event.target.value)}
                  placeholder="Leave a comment..."
                  className="min-h-[90px] text-sm"
                />
                {commentError ? <p className="text-xs text-[#dc2626]">{commentError}</p> : null}
                <Button
                  type="submit"
                  size="sm"
                  disabled={!commentText.trim() || isSubmittingComment}
                  className="w-full"
                >
                  <MessageSquare className="mr-1.5 h-4 w-4" />
                  {isSubmittingComment ? "Posting..." : "Post comment"}
                </Button>
              </form>
            ) : (
              <a
                href={`/sign-in?redirect_url=${encodeURIComponent(`/watch/${publicId}`)}`}
                className="block"
              >
                <Button className="w-full">
                  <MessageSquare className="mr-1.5 h-4 w-4" />
                  Sign in to comment
                </Button>
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
