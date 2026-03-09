import { useAction, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Link, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { VideoPlayer, type VideoPlayerHandle } from "@/components/video-player/VideoPlayer";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatDuration, formatTimestamp, formatRelativeTime } from "@/lib/utils";
import { AlertCircle, ArrowLeft } from "lucide-react";
export default function ProjectShareVideoPage() {
  const params = useParams({ strict: false });
  const token = params.token as string;
  const videoId = params.videoId as string;

  const getPlaybackSession = useAction(api.videoActions.getProjectSharePlaybackSession);

  const video = useQuery(api.videos.getForProjectShare, { shareToken: token, videoId });
  const comments = useQuery(api.comments.getThreadedForProjectShare, { shareToken: token, videoId });

  const [playbackSession, setPlaybackSession] = useState<{
    url: string;
    posterUrl: string;
  } | null>(null);
  const [isLoadingPlayback, setIsLoadingPlayback] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const playerRef = useRef<VideoPlayerHandle | null>(null);

  useEffect(() => {
    if (!video?.muxPlaybackId) {
      setPlaybackSession(null);
      setIsLoadingPlayback(false);
      setPlaybackError(null);
      return;
    }

    let cancelled = false;
    setPlaybackSession(null);
    setIsLoadingPlayback(true);
    setPlaybackError(null);

    void getPlaybackSession({ shareToken: token, videoId })
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
  }, [getPlaybackSession, token, videoId, video?.muxPlaybackId]);

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

  if (video === undefined) {
    return (
      <div className="min-h-screen bg-[#f0f0e8] flex items-center justify-center">
        <div className="text-[#888]">Loading...</div>
      </div>
    );
  }

  if (video === null) {
    return (
      <div className="min-h-screen bg-[#f0f0e8] flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-[#dc2626]/10 flex items-center justify-center mb-4 border-2 border-[#dc2626]">
              <AlertCircle className="h-6 w-6 text-[#dc2626]" />
            </div>
            <CardTitle>Video not available</CardTitle>
            <CardDescription>
              This video is not available or the share link is invalid.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f0e8]">
      <header className="bg-[#f0f0e8] border-b-2 border-[#1a1a1a] px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link
            to="/project-share/$token/"
            params={{ token }}
            preload="intent"
            className="text-[#888] hover:text-[#1a1a1a] text-sm flex items-center gap-2 font-bold"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to project
          </Link>
          <Link
            preload="intent"
            to="/"
            className="text-[#888] hover:text-[#1a1a1a] text-sm font-bold"
          >
            lawn
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-black text-[#1a1a1a]">{video.title}</h1>
          {video.description && (
            <p className="text-[#888] mt-1">{video.description}</p>
          )}
          <div className="flex items-center gap-4 mt-2 text-sm text-[#888]">
            {video.duration && <span className="font-mono">{formatDuration(video.duration)}</span>}
            {comments && <span>{comments.length} threads</span>}
          </div>
        </div>

        <div className="border-2 border-[#1a1a1a] overflow-hidden">
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
            <div className="relative aspect-video overflow-hidden bg-black">
              {video.thumbnailUrl?.startsWith("http") ? (
                <img
                  src={video.thumbnailUrl}
                  alt={`${video.title} thumbnail`}
                  className="h-full w-full object-cover blur-[4px]"
                />
              ) : null}
              <div className="absolute inset-0 bg-black/45" />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
                <p className="text-sm font-medium text-white/85">
                  {playbackError ?? (isLoadingPlayback ? "Loading stream..." : "Preparing stream...")}
                </p>
              </div>
            </div>
          )}
        </div>

        <section className="border-2 border-[#1a1a1a] bg-[#e8e8e0] p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-black text-[#1a1a1a]">Comments</h2>
            <span className="text-xs text-[#888] font-mono">{formatTimestamp(currentTime)}</span>
          </div>

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
                      onClick={() => playerRef.current?.seekTo(comment.timestampSeconds, { play: true })}
                    >
                      {formatTimestamp(comment.timestampSeconds)}
                    </button>
                  </div>
                  <p className="text-sm text-[#1a1a1a] mt-1 whitespace-pre-wrap">{comment.text}</p>
                  <p className="text-[11px] text-[#888] mt-1">{formatRelativeTime(comment._creationTime)}</p>

                  {comment.replies.length > 0 ? (
                    <div className="mt-3 ml-4 border-l-2 border-[#1a1a1a] pl-3 space-y-2">
                      {comment.replies.map((reply) => (
                        <div key={reply._id} className="text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-[#1a1a1a]">{reply.userName}</span>
                            <button
                              type="button"
                              className="font-mono text-xs text-[#2d5a2d] hover:text-[#1a1a1a]"
                              onClick={() => playerRef.current?.seekTo(reply.timestampSeconds, { play: true })}
                            >
                              {formatTimestamp(reply.timestampSeconds)}
                            </button>
                          </div>
                          <p className="text-[#1a1a1a] whitespace-pre-wrap">{reply.text}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="border-t-2 border-[#1a1a1a] px-6 py-4 mt-8">
        <div className="max-w-6xl mx-auto text-center text-sm text-[#888]">
          Shared via{" "}
          <Link to="/" preload="intent" className="text-[#1a1a1a] hover:text-[#2d5a2d] font-bold">
            lawn
          </Link>
        </div>
      </footer>
    </div>
  );
}
