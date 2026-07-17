import { useAction, useConvex, useMutation } from "convex/react";
import { Link } from "@tanstack/react-router";
import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  AlertCircle,
  ChevronRight,
  Clock,
  Folder,
  Link2,
  Loader2,
  MessageSquare,
  Play,
} from "lucide-react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { CommentText } from "@/components/comments/CommentText";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { VideoPlayer, type VideoPlayerHandle } from "@/components/video-player/VideoPlayer";
import { folderSharePath } from "@/lib/routes";
import { sortDashboardItems } from "@/lib/dashboardSort";
import { prefetchHlsRuntime } from "@/lib/muxPlayback";
import { useRoutePrewarmIntent } from "@/lib/useRoutePrewarmIntent";
import { formatDuration, formatRelativeTime, formatTimestamp } from "@/lib/utils";
import { prewarmSharedFolder, prewarmSharedVideo, useFolderShareData } from "./-folder-share.data";

type FolderSharePageProps = {
  token: string;
  folderId?: string;
  videoId?: string;
};

const FOLDER_SHARE_PLAYBACK_REFRESH_LEAD_MS = 60_000;
const FOLDER_SHARE_PLAYBACK_REFRESH_RETRY_MS = 10_000;

type SharedFolderLinkProps = {
  token: string;
  grantToken: string;
  folderId: Id<"projects">;
  rootFolderId?: Id<"projects">;
  className?: string;
  children: ReactNode;
};

const SharedFolderLink = forwardRef<HTMLAnchorElement, SharedFolderLinkProps>(
  function SharedFolderLink(
    { token, grantToken, folderId, rootFolderId, className, children },
    ref,
  ) {
    const convex = useConvex();
    const destinationFolderId = folderId === rootFolderId ? undefined : folderId;
    const prewarmIntentHandlers = useRoutePrewarmIntent(() =>
      prewarmSharedFolder(convex, { grantToken, folderId: destinationFolderId }),
    );

    return (
      <Link
        ref={ref}
        to={folderSharePath(token, { folderId: destinationFolderId })}
        preload="intent"
        className={className}
        {...prewarmIntentHandlers}
      >
        {children}
      </Link>
    );
  },
);

type SharedFolderCardProps = {
  token: string;
  grantToken: string;
  folder: {
    _id: Id<"projects">;
    name: string;
    description?: string;
  };
};

function SharedFolderCard({ token, grantToken, folder }: SharedFolderCardProps) {
  return (
    <SharedFolderLink
      token={token}
      grantToken={grantToken}
      folderId={folder._id}
      className="group block border-2 border-[#1a1a1a] bg-[#f0f0e8] p-4 shadow-[5px_5px_0px_0px_var(--shadow-color)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:bg-[#e8e8e0] hover:shadow-[3px_3px_0px_0px_var(--shadow-color)] focus:outline-2 focus:outline-offset-4 focus:outline-[#2d5a2d]"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-none items-center justify-center border-2 border-[#1a1a1a] bg-[#e8e8e0]">
          <Folder className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-black text-[#1a1a1a]">{folder.name}</h3>
          <p className="mt-1 line-clamp-2 text-xs text-[#888]">
            {folder.description || "Open folder"}
          </p>
        </div>
        <ChevronRight
          className="mt-2 h-4 w-4 flex-none text-[#888] transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </div>
    </SharedFolderLink>
  );
}

type SharedVideoCardProps = {
  token: string;
  grantToken: string;
  folderId?: Id<"projects">;
  video: {
    _id: Id<"videos">;
    title: string;
    description?: string;
    duration?: number;
    createdAt: number;
    versionNumber: number;
  };
};

function SharedVideoCard({ token, grantToken, folderId, video }: SharedVideoCardProps) {
  const convex = useConvex();
  const prewarmIntentHandlers = useRoutePrewarmIntent(() => {
    prewarmSharedVideo(convex, { grantToken, videoId: video._id });
    prefetchHlsRuntime();
  });

  return (
    <Link
      to={folderSharePath(token, { folderId, videoId: video._id })}
      preload="intent"
      className="group block focus:outline-2 focus:outline-offset-4 focus:outline-[#2d5a2d]"
      {...prewarmIntentHandlers}
    >
      <div className="relative aspect-video overflow-hidden border-2 border-[#1a1a1a] bg-[#e8e8e0] shadow-[5px_5px_0px_0px_var(--shadow-color)] transition-all group-hover:translate-x-[2px] group-hover:translate-y-[2px] group-hover:shadow-[3px_3px_0px_0px_var(--shadow-color)]">
        <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_center,rgba(45,90,45,0.15),transparent_65%)]">
          <div className="flex h-12 w-12 items-center justify-center border-2 border-[#1a1a1a] bg-[#f0f0e8] shadow-[3px_3px_0px_0px_var(--shadow-color)]">
            <Play className="ml-0.5 h-5 w-5" aria-hidden="true" />
          </div>
        </div>
        {video.duration ? (
          <span className="absolute right-2 bottom-2 bg-black/75 px-1.5 py-0.5 font-mono text-[11px] text-white">
            {formatDuration(video.duration)}
          </span>
        ) : null}
        {video.versionNumber > 1 ? (
          <span className="absolute top-2 left-2 border border-[#1a1a1a] bg-[#f0f0e8] px-1.5 py-0.5 font-mono text-[10px] font-bold">
            V{video.versionNumber}
          </span>
        ) : null}
      </div>
      <div className="mt-2.5">
        <h3 className="truncate text-[15px] leading-tight font-black text-[#1a1a1a]">
          {video.title}
        </h3>
        <p className="mt-1 text-xs text-[#888]">{formatRelativeTime(video.createdAt)}</p>
      </div>
    </Link>
  );
}

function ShareUnavailable({
  token,
  canReturnToRoot = false,
  onRetry,
}: {
  token: string;
  canReturnToRoot?: boolean;
  onRetry?: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f0f0e8] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center border-2 border-[#dc2626] bg-[#dc2626]/10">
            <AlertCircle className="h-6 w-6 text-[#dc2626]" aria-hidden="true" />
          </div>
          <CardTitle>Folder unavailable</CardTitle>
          <CardDescription>
            {onRetry
              ? "The shared folder could not be opened right now. Try the link again."
              : "This link was revoked, expired, or no longer includes the item you opened."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {onRetry ? (
            <Button type="button" className="w-full" onClick={onRetry}>
              Try again
            </Button>
          ) : null}
          {canReturnToRoot ? (
            <Button asChild variant="outline" className="w-full">
              <Link to={folderSharePath(token)}>Return to shared folder</Link>
            </Button>
          ) : null}
          <Button asChild variant={canReturnToRoot ? "ghost" : "outline"} className="w-full">
            <Link to="/">Go to lawn</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function FolderSharePage({ token, folderId, videoId }: FolderSharePageProps) {
  const issueAccessGrant = useMutation(api.folderShares.issueAccessGrant);
  const getPlaybackSession = useAction(api.videoActions.getFolderSharedPlaybackSession);
  const [grantToken, setGrantToken] = useState<string | null>(null);
  const [hasAttemptedGrant, setHasAttemptedGrant] = useState(false);
  const grantRequestPendingRef = useRef(false);
  const [grantError, setGrantError] = useState(false);
  const [playbackSession, setPlaybackSession] = useState<{
    videoId: string;
    url: string;
    posterUrl: string;
    expiresAt: number;
  } | null>(null);
  const [playbackLoading, setPlaybackLoading] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [playbackRefreshFailureCount, setPlaybackRefreshFailureCount] = useState(0);
  const [playbackReady, setPlaybackReady] = useState(false);
  const playbackRequestSequenceRef = useRef(0);
  const playbackVideoIdRef = useRef<string | null>(null);
  const playerRef = useRef<VideoPlayerHandle | null>(null);

  const {
    shareInfo,
    folder,
    folders,
    foldersStatus,
    foldersInitialLoading,
    loadMoreFolders,
    videos,
    videosStatus,
    videosInitialLoading,
    loadMoreVideos,
    video,
  } = useFolderShareData({ token, grantToken, folderId, videoId });
  const renderedVideo = video;

  useEffect(() => {
    setGrantToken(null);
    setHasAttemptedGrant(false);
    setGrantError(false);
    grantRequestPendingRef.current = false;
  }, [token]);

  const acquireGrant = useCallback(async () => {
    if (grantRequestPendingRef.current) return;
    grantRequestPendingRef.current = true;
    setHasAttemptedGrant(true);
    setGrantError(false);
    try {
      const result = await issueAccessGrant({ token });
      if (result.ok && result.grantToken) {
        setGrantToken(result.grantToken);
      } else {
        setGrantError(true);
      }
    } catch {
      setGrantError(true);
    } finally {
      grantRequestPendingRef.current = false;
    }
  }, [issueAccessGrant, token]);

  useEffect(() => {
    if (grantToken || hasAttemptedGrant) return;
    void acquireGrant();
  }, [acquireGrant, grantToken, hasAttemptedGrant]);

  const loadPlayback = useCallback(
    (preserveCurrentSession = false) => {
      const requestSequence = playbackRequestSequenceRef.current + 1;
      playbackRequestSequenceRef.current = requestSequence;
      if (!preserveCurrentSession) {
        playbackVideoIdRef.current = null;
        setPlaybackSession(null);
        setPlaybackError(null);
        setPlaybackReady(false);
        setPlaybackRefreshFailureCount(0);
      }
      if (!grantToken || !videoId) {
        setPlaybackLoading(false);
        return;
      }

      setPlaybackLoading(true);
      void getPlaybackSession({ grantToken, videoId })
        .then((result) => {
          if (requestSequence !== playbackRequestSequenceRef.current) return;
          if (result.status === "rateLimited") {
            if (preserveCurrentSession) {
              setPlaybackRefreshFailureCount((failureCount) => failureCount + 1);
              return;
            }
            const retryAfterSeconds = Math.max(1, Math.ceil(result.retryAfterMs / 1000));
            setPlaybackError(`Too many playback requests. Try again in ${retryAfterSeconds}s.`);
            return;
          }
          setPlaybackSession({
            videoId,
            url: result.url,
            posterUrl: result.posterUrl,
            expiresAt: result.expiresAt,
          });
          playbackVideoIdRef.current = videoId;
          setPlaybackRefreshFailureCount(0);
        })
        .catch(() => {
          if (requestSequence === playbackRequestSequenceRef.current) {
            if (preserveCurrentSession) {
              setPlaybackRefreshFailureCount((failureCount) => failureCount + 1);
            } else {
              setPlaybackError("This video could not be loaded.");
            }
          }
        })
        .finally(() => {
          if (requestSequence === playbackRequestSequenceRef.current) {
            setPlaybackLoading(false);
          }
        });
    },
    [getPlaybackSession, grantToken, videoId],
  );

  const handlePlaybackIssue = useCallback(() => {
    playbackRequestSequenceRef.current += 1;
    playbackVideoIdRef.current = null;
    setPlaybackSession(null);
    setPlaybackLoading(false);
    setPlaybackReady(false);
    setPlaybackRefreshFailureCount(0);
    setPlaybackError("This video could not be played.");
  }, []);

  useEffect(() => {
    loadPlayback(Boolean(videoId && playbackVideoIdRef.current === videoId));
    return () => {
      playbackRequestSequenceRef.current += 1;
    };
  }, [loadPlayback, videoId]);

  useEffect(() => {
    if (
      shareInfo?.status !== "ok" ||
      !grantToken ||
      !videoId ||
      !renderedVideo ||
      !playbackSession ||
      playbackSession.videoId !== videoId ||
      playbackLoading
    ) {
      return;
    }
    const delay =
      playbackRefreshFailureCount > 0
        ? FOLDER_SHARE_PLAYBACK_REFRESH_RETRY_MS
        : Math.max(
            playbackSession.expiresAt - Date.now() - FOLDER_SHARE_PLAYBACK_REFRESH_LEAD_MS,
            0,
          );
    const timeout = window.setTimeout(() => loadPlayback(true), delay);
    return () => window.clearTimeout(timeout);
  }, [
    loadPlayback,
    grantToken,
    playbackLoading,
    playbackRefreshFailureCount,
    playbackSession,
    shareInfo?.status,
    renderedVideo?.video._id,
    videoId,
  ]);

  const commentMarkers = useMemo(() => {
    if (!renderedVideo) return [];
    return renderedVideo.comments.flatMap((comment) => [
      {
        _id: comment._id,
        timestampSeconds: comment.timestampSeconds,
        resolved: comment.resolved,
      },
      ...comment.replies.map((reply) => ({
        _id: reply._id,
        timestampSeconds: reply.timestampSeconds,
        resolved: reply.resolved,
      })),
    ]);
  }, [renderedVideo]);
  const sortedFolders = useMemo(() => sortDashboardItems(folders, "alphabetical"), [folders]);

  const bootstrapping =
    shareInfo === undefined ||
    (shareInfo.status === "ok" &&
      ((!grantToken && !grantError) ||
        (Boolean(grantToken) && (videoId ? renderedVideo === undefined : folder === undefined))));

  if (bootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f0f0e8]">
        <div className="flex items-center gap-2 text-sm font-bold text-[#888]" role="status">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Opening shared folder…
        </div>
      </div>
    );
  }

  if (grantError && shareInfo.status === "ok") {
    return (
      <ShareUnavailable
        token={token}
        onRetry={() => {
          setGrantError(false);
          setHasAttemptedGrant(false);
        }}
      />
    );
  }

  if (shareInfo.status === "missing" || !grantToken) {
    return <ShareUnavailable token={token} />;
  }

  if (videoId) {
    if (!renderedVideo) {
      return <ShareUnavailable token={token} canReturnToRoot />;
    }
    const video = renderedVideo;

    const backFolderId = video.folder._id;
    const rootFolderId = video.breadcrumbs[0]?._id;
    return (
      <div className="min-h-screen bg-[#f0f0e8] text-[#1a1a1a]">
        <header className="border-b-2 border-[#1a1a1a] px-4 py-3 sm:px-6">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <Link to="/" className="text-xl font-black tracking-tighter hover:text-[#2d5a2d]">
              lawn.
            </Link>
            <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-[#888] uppercase">
              <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
              Shared folder
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl p-4 sm:p-6">
          <nav
            aria-label="Shared folder breadcrumbs"
            className="mb-5 flex min-w-0 items-center gap-1 overflow-x-auto text-sm"
          >
            {video.breadcrumbs.map((crumb, index) => (
              <div key={crumb._id} className="flex min-w-0 items-center gap-1">
                {index > 0 ? <ChevronRight className="h-3.5 w-3.5 flex-none text-[#888]" /> : null}
                <SharedFolderLink
                  token={token}
                  grantToken={grantToken}
                  folderId={crumb._id}
                  rootFolderId={rootFolderId}
                  className="max-w-48 truncate font-bold underline hover:text-[#2d5a2d] focus:outline-2 focus:outline-offset-2 focus:outline-[#2d5a2d]"
                >
                  {crumb.name}
                </SharedFolderLink>
              </div>
            ))}
            <ChevronRight className="h-3.5 w-3.5 flex-none text-[#888]" />
            <span className="max-w-64 truncate text-[#888]" aria-current="page">
              {video.video.title}
            </span>
          </nav>

          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                {video.video.title}
              </h1>
              {video.video.description ? (
                <p className="mt-1 max-w-3xl text-sm text-[#666]">{video.video.description}</p>
              ) : null}
            </div>
            <Button asChild variant="outline" size="sm">
              <SharedFolderLink
                token={token}
                grantToken={grantToken}
                folderId={backFolderId}
                rootFolderId={rootFolderId}
              >
                Back to folder
              </SharedFolderLink>
            </Button>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <section aria-label="Video player">
              <div className="overflow-hidden border-2 border-[#1a1a1a] bg-black shadow-[7px_7px_0px_0px_var(--shadow-color)]">
                {playbackSession ? (
                  <VideoPlayer
                    ref={playerRef}
                    src={playbackSession.url}
                    poster={playbackSession.posterUrl}
                    comments={commentMarkers}
                    allowDownload={false}
                    controlsBelow
                    onReadyChange={setPlaybackReady}
                    onPlaybackIssue={handlePlaybackIssue}
                  />
                ) : (
                  <div className="flex aspect-video items-center justify-center bg-black text-white">
                    <div className="flex flex-col items-center gap-3 text-center">
                      {playbackLoading ? (
                        <Loader2 className="h-7 w-7 animate-spin" />
                      ) : (
                        <Play className="h-7 w-7" />
                      )}
                      <p className="text-sm text-white/80">{playbackError ?? "Preparing video…"}</p>
                      {playbackError ? (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          aria-label="Try loading the shared video again"
                          onClick={() => loadPlayback()}
                        >
                          Try again
                        </Button>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            </section>

            <aside className="border-2 border-[#1a1a1a] bg-[#e8e8e0] lg:max-h-[calc(100vh-12rem)] lg:overflow-y-auto">
              <div className="sticky top-0 z-10 flex items-center justify-between border-b-2 border-[#1a1a1a] bg-[#e8e8e0] px-4 py-3">
                <h2 className="flex items-center gap-2 font-black">
                  <MessageSquare className="h-4 w-4" aria-hidden="true" />
                  Comments
                </h2>
                <span className="text-xs font-bold text-[#888]">Read only</span>
              </div>
              <div className="space-y-3 p-4">
                {video.comments.length === 0 ? (
                  <p className="text-sm text-[#888]">No comments yet.</p>
                ) : (
                  video.comments.map((comment) => (
                    <article
                      key={comment._id}
                      className="border-2 border-[#1a1a1a] bg-[#f0f0e8] p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-sm font-bold">{comment.userName}</div>
                        <button
                          type="button"
                          className="flex items-center gap-1 font-mono text-xs text-[#2d5a2d] hover:underline disabled:cursor-not-allowed disabled:no-underline disabled:opacity-40"
                          disabled={!playbackReady}
                          onClick={() =>
                            playerRef.current?.seekTo(comment.timestampSeconds, { play: true })
                          }
                          aria-label={`Play ${comment.userName}'s comment at ${formatTimestamp(comment.timestampSeconds)}`}
                        >
                          <Clock className="h-3 w-3" aria-hidden="true" />
                          {formatTimestamp(comment.timestampSeconds)}
                        </button>
                      </div>
                      <p className="mt-1 text-sm break-words whitespace-pre-wrap">
                        <CommentText text={comment.text} />
                      </p>
                      <p className="mt-1 text-[11px] text-[#888]">
                        {formatRelativeTime(comment._creationTime)}
                      </p>
                      {comment.replies.length > 0 ? (
                        <div className="mt-3 space-y-2 border-l-2 border-[#1a1a1a] pl-3">
                          {comment.replies.map((reply) => (
                            <div key={reply._id}>
                              <div className="flex items-start justify-between gap-2 text-xs">
                                <span className="font-bold">{reply.userName}</span>
                                <button
                                  type="button"
                                  className="font-mono text-[#2d5a2d] hover:underline disabled:cursor-not-allowed disabled:no-underline disabled:opacity-40"
                                  disabled={!playbackReady}
                                  onClick={() =>
                                    playerRef.current?.seekTo(reply.timestampSeconds, {
                                      play: true,
                                    })
                                  }
                                  aria-label={`Play ${reply.userName}'s reply at ${formatTimestamp(reply.timestampSeconds)}`}
                                >
                                  {formatTimestamp(reply.timestampSeconds)}
                                </button>
                              </div>
                              <p className="mt-0.5 text-sm break-words whitespace-pre-wrap">
                                <CommentText text={reply.text} />
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </article>
                  ))
                )}
                {video.commentsTruncated ? (
                  <p className="text-xs text-[#888]">Only the first 200 comments are shown.</p>
                ) : null}
              </div>
            </aside>
          </div>
        </main>
      </div>
    );
  }

  if (!folder) {
    return <ShareUnavailable token={token} canReturnToRoot={Boolean(folderId)} />;
  }

  const currentFolderSearchId =
    folder.current._id === folder.root._id ? undefined : folder.current._id;

  return (
    <div className="min-h-screen bg-[#f0f0e8] text-[#1a1a1a]">
      <header className="border-b-2 border-[#1a1a1a] px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link to="/" className="text-xl font-black tracking-tighter hover:text-[#2d5a2d]">
            lawn.
          </Link>
          <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-[#888] uppercase">
            <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
            Shared folder
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
        <nav
          aria-label="Shared folder breadcrumbs"
          className="mb-5 flex min-w-0 items-center gap-1 overflow-x-auto text-sm"
        >
          {folder.breadcrumbs.map((crumb, index) => (
            <div key={crumb._id} className="flex min-w-0 items-center gap-1">
              {index > 0 ? <ChevronRight className="h-3.5 w-3.5 flex-none text-[#888]" /> : null}
              {index === folder.breadcrumbs.length - 1 ? (
                <span className="max-w-56 truncate font-bold" aria-current="page">
                  {crumb.name}
                </span>
              ) : (
                <SharedFolderLink
                  token={token}
                  grantToken={grantToken}
                  folderId={crumb._id}
                  rootFolderId={folder.root._id}
                  className="max-w-48 truncate font-bold text-[#666] underline hover:text-[#2d5a2d] focus:outline-2 focus:outline-offset-2 focus:outline-[#2d5a2d]"
                >
                  {crumb.name}
                </SharedFolderLink>
              )}
            </div>
          ))}
        </nav>

        <div className="mb-7 max-w-3xl">
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{folder.current.name}</h1>
          {folder.current.description ? (
            <p className="mt-2 text-sm leading-relaxed text-[#666] sm:text-base">
              {folder.current.description}
            </p>
          ) : null}
        </div>

        {foldersInitialLoading ? (
          <div className="mb-9 flex items-center gap-2 py-8 text-sm text-[#888]" role="status">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Loading folders…
          </div>
        ) : sortedFolders.length > 0 ? (
          <section className="mb-9" aria-labelledby="shared-folders-heading">
            <h2
              id="shared-folders-heading"
              className="mb-3 text-xs font-black tracking-wider text-[#888] uppercase"
            >
              Folders
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {sortedFolders.map((child) => (
                <SharedFolderCard
                  key={child._id}
                  token={token}
                  grantToken={grantToken}
                  folder={child}
                />
              ))}
            </div>
            {foldersStatus === "CanLoadMore" || foldersStatus === "LoadingMore" ? (
              <div className="mt-6 flex justify-center">
                <Button
                  type="button"
                  variant="outline"
                  disabled={foldersStatus === "LoadingMore"}
                  onClick={loadMoreFolders}
                >
                  {foldersStatus === "LoadingMore" ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : null}
                  {foldersStatus === "LoadingMore" ? "Loading…" : "Load more folders"}
                </Button>
              </div>
            ) : null}
          </section>
        ) : null}

        <section aria-labelledby="shared-videos-heading">
          <h2
            id="shared-videos-heading"
            className="mb-3 text-xs font-black tracking-wider text-[#888] uppercase"
          >
            Videos
          </h2>
          {videosInitialLoading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-[#888]" role="status">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading videos…
            </div>
          ) : videos.length > 0 ? (
            <div className="grid grid-cols-1 gap-x-5 gap-y-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {videos.map((sharedVideo) => (
                <SharedVideoCard
                  key={sharedVideo._id}
                  token={token}
                  grantToken={grantToken}
                  folderId={currentFolderSearchId}
                  video={sharedVideo}
                />
              ))}
            </div>
          ) : (
            <div className="border-2 border-dashed border-[#1a1a1a]/40 p-8 text-center text-sm text-[#888]">
              No ready videos in this folder yet.
            </div>
          )}

          {videosStatus === "CanLoadMore" || videosStatus === "LoadingMore" ? (
            <div className="mt-8 flex justify-center">
              <Button
                type="button"
                variant="outline"
                disabled={videosStatus === "LoadingMore"}
                onClick={loadMoreVideos}
              >
                {videosStatus === "LoadingMore" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                {videosStatus === "LoadingMore" ? "Loading…" : "Load more videos"}
              </Button>
            </div>
          ) : null}
        </section>
      </main>

      <footer className="mt-10 border-t-2 border-[#1a1a1a] px-4 py-5 text-center text-sm text-[#888]">
        Shared via{" "}
        <Link to="/" className="font-bold text-[#1a1a1a] hover:text-[#2d5a2d]">
          lawn
        </Link>
      </footer>
    </div>
  );
}
