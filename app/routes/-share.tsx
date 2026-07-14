import { useAction, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Link, useParams } from "@tanstack/react-router";
import { useUser } from "@clerk/tanstack-react-start";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { VideoPlayer, type VideoPlayerHandle } from "@/components/video-player/VideoPlayer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { triggerDownload } from "@/lib/download";
import { formatDuration, formatTimestamp, formatRelativeTime } from "@/lib/utils";
import { useVideoPresence } from "@/lib/useVideoPresence";
import { VideoWatchers } from "@/components/presence/VideoWatchers";
import { CommentText } from "@/components/comments/CommentText";
import { NestedReplies } from "@/components/comments/NestedReplies";
import { walkThreadedComments } from "@/lib/threadedComments";
import { Lock, Video, AlertCircle, MessageSquare, Clock, Download } from "lucide-react";
import { useShareData } from "./-share.data";

export default function SharePage() {
  const params = useParams({ strict: false });
  const token = params.token as string;
  const { user, isLoaded: isUserLoaded } = useUser();

  const issueAccessGrant = useMutation(api.shareLinks.issueAccessGrant);
  const createComment = useMutation(api.comments.createForShareGrant);
  const getPlaybackSession = useAction(api.videoActions.getSharedPlaybackSession);
  const getDownloadUrl = useAction(api.videoActions.getSharedDownloadUrl);

  const [grantToken, setGrantToken] = useState<string | null>(null);
  const [hasAttemptedAutoGrant, setHasAttemptedAutoGrant] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [isRequestingGrant, setIsRequestingGrant] = useState(false);
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
  const playerRef = useRef<VideoPlayerHandle | null>(null);

  useEffect(() => {
    setIsDownloading(false);
    setDownloadError(null);
  }, [token]);

  const { shareInfo, videoData, comments } = useShareData({ token, grantToken });
  const canTrackPresence = Boolean(playbackSession?.url && videoData?.video?._id);
  const { watchers } = useVideoPresence({
    videoId: videoData?.video?._id,
    enabled: canTrackPresence,
    shareToken: token,
  });

  useEffect(() => {
    setGrantToken(null);
    setHasAttemptedAutoGrant(false);
  }, [token]);

  const acquireGrant = useCallback(
    async (password?: string) => {
      if (isRequestingGrant) return;
      setIsRequestingGrant(true);
      setPasswordError(false);

      try {
        const result = await issueAccessGrant({ token, password });
        if (result.ok && result.grantToken) {
          setGrantToken(result.grantToken);
          return true;
        }

        setPasswordError(Boolean(password));
        return false;
      } catch {
        setPasswordError(Boolean(password));
        return false;
      } finally {
        setIsRequestingGrant(false);
      }
    },
    [isRequestingGrant, issueAccessGrant, token],
  );

  useEffect(() => {
    if (!shareInfo || grantToken) return;
    if (shareInfo.status !== "ok" || hasAttemptedAutoGrant) return;

    setHasAttemptedAutoGrant(true);
    void acquireGrant();
  }, [acquireGrant, grantToken, hasAttemptedAutoGrant, shareInfo]);

  useEffect(() => {
    if (!grantToken) {
      setPlaybackSession(null);
      setPlaybackError(null);
      return;
    }

    let cancelled = false;
    setIsLoadingPlayback(true);
    setPlaybackError(null);

    void getPlaybackSession({ grantToken })
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
  }, [getPlaybackSession, grantToken]);

  const flattenedComments = useMemo(() => {
    if (!comments) return [] as Array<{ _id: string; timestampSeconds: number; resolved: boolean }>;

    const markers: Array<{ _id: string; timestampSeconds: number; resolved: boolean }> = [];
    walkThreadedComments(comments, (comment) => {
      markers.push({
        _id: comment._id,
        timestampSeconds: comment.timestampSeconds,
        resolved: comment.resolved,
      });
    });
    return markers;
  }, [comments]);

  const handleSubmitComment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!grantToken || !commentText.trim() || isSubmittingComment) return;

    setIsSubmittingComment(true);
    setCommentError(null);
    try {
      await createComment({
        grantToken,
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
    if (!grantToken || isDownloading) return;

    setDownloadError(null);
    setIsDownloading(true);
    try {
      const result = await getDownloadUrl({ grantToken });
      triggerDownload(result.url, result.filename);
    } catch (error) {
      console.error("Failed to prepare shared download:", error);
      setDownloadError(
        error instanceof Error ? error.message : "Unable to prepare this download right now.",
      );
    } finally {
      setIsDownloading(false);
    }
  }, [getDownloadUrl, grantToken, isDownloading]);

  const isBootstrappingShare =
    shareInfo === undefined ||
    (shareInfo?.status === "ok" &&
      ((!grantToken && (!hasAttemptedAutoGrant || isRequestingGrant)) ||
        (Boolean(grantToken) && videoData === undefined)));

  if (isBootstrappingShare) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f0f0e8]">
        <div className="text-[#888]">Opening shared video...</div>
      </div>
    );
  }

  if (shareInfo.status === "missing" || shareInfo.status === "expired") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f0f0e8] p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center border-2 border-[#dc2626] bg-[#dc2626]/10">
              <AlertCircle className="h-6 w-6 text-[#dc2626]" />
            </div>
            <CardTitle>Link expired or invalid</CardTitle>
            <CardDescription>
              This share link is no longer valid. Please ask the video owner for a new link.
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

  if (shareInfo.status === "requiresPassword" && !grantToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f0f0e8] p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center border-2 border-[#1a1a1a] bg-[#e8e8e0]">
              <Lock className="h-6 w-6 text-[#888]" />
            </div>
            <CardTitle>Password required</CardTitle>
            <CardDescription>
              This video is password protected. Enter the password to view.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                await acquireGrant(passwordInput);
              }}
              className="space-y-4"
            >
              <Input
                type="password"
                placeholder="Enter password"
                value={passwordInput}
                onChange={(event) => setPasswordInput(event.target.value)}
                autoFocus
              />
              {passwordError && <p className="text-sm text-[#dc2626]">Incorrect password</p>}
              <Button
                type="submit"
                className="w-full"
                disabled={!passwordInput || isRequestingGrant}
              >
                {isRequestingGrant ? "Verifying..." : "View video"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!videoData?.video) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f0f0e8] p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center border-2 border-[#1a1a1a] bg-[#e8e8e0]">
              <Video className="h-6 w-6 text-[#888]" />
            </div>
            <CardTitle>Video not available</CardTitle>
            <CardDescription>This video is not available or is still processing.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const video = videoData.video;

  return (
    <div className="min-h-screen bg-[#f0f0e8]">
      <header className="border-b-2 border-[#1a1a1a] bg-[#f0f0e8] px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link
            preload="intent"
            to="/"
            className="flex items-center gap-2 text-sm font-bold text-[#888] hover:text-[#1a1a1a]"
          >
            lawn
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleDownload()}
            disabled={!grantToken || isDownloading}
          >
            <Download className="h-4 w-4" />
            {isDownloading ? "Preparing..." : "Download"}
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 p-6">
        {downloadError ? (
          <div
            role="alert"
            className="border-2 border-[#dc2626] bg-[#dc2626]/10 px-4 py-3 text-sm text-[#7f1d1d]"
          >
            {downloadError}
          </div>
        ) : null}

        <div>
          <h1 className="text-2xl font-black text-[#1a1a1a]">{video.title}</h1>
          {video.description && <p className="mt-1 text-[#888]">{video.description}</p>}
          <div className="mt-2 flex items-center gap-4 text-sm text-[#888]">
            {video.duration && <span className="font-mono">{formatDuration(video.duration)}</span>}
            {comments && <span>{comments.length} threads</span>}
            <VideoWatchers watchers={watchers} className="ml-auto" />
          </div>
        </div>

        <div className="overflow-hidden border-2 border-[#1a1a1a]">
          {playbackSession?.url ? (
            <VideoPlayer
              ref={playerRef}
              src={playbackSession.url}
              poster={playbackSession.posterUrl}
              comments={flattenedComments}
              onTimeUpdate={setCurrentTime}
              allowDownload={false}
            />
          ) : (
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
                  {playbackError ??
                    (isLoadingPlayback ? "Loading stream..." : "Preparing stream...")}
                </p>
              </div>
            </div>
          )}
        </div>

        <section className="space-y-4 border-2 border-[#1a1a1a] bg-[#e8e8e0] p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-black text-[#1a1a1a]">Comments</h2>
            <span className="font-mono text-xs text-[#888]">{formatTimestamp(currentTime)}</span>
          </div>

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
                className="min-h-[90px]"
              />
              {commentError ? <p className="text-xs text-[#dc2626]">{commentError}</p> : null}
              <Button type="submit" disabled={!commentText.trim() || isSubmittingComment}>
                <MessageSquare className="mr-1.5 h-4 w-4" />
                {isSubmittingComment ? "Posting..." : "Post comment"}
              </Button>
            </form>
          ) : (
            <a
              href={`/sign-in?redirect_url=${encodeURIComponent(`/share/${token}`)}`}
              className="inline-flex"
            >
              <Button>
                <MessageSquare className="mr-1.5 h-4 w-4" />
                Sign in to comment
              </Button>
            </a>
          )}

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

                  <NestedReplies
                    replies={comment.replies}
                    onSeek={(seconds) => playerRef.current?.seekTo(seconds, { play: true })}
                  />
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="mt-8 border-t-2 border-[#1a1a1a] px-6 py-4">
        <div className="mx-auto max-w-6xl text-center text-sm text-[#888]">
          Shared via{" "}
          <Link to="/" preload="intent" className="font-bold text-[#1a1a1a] hover:text-[#2d5a2d]">
            lawn
          </Link>
        </div>
      </footer>
    </div>
  );
}
