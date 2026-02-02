"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { useParams } from "next/navigation";
import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { VideoPlayer, type VideoPlayerHandle } from "@/components/video-player/VideoPlayer";
import { CommentList } from "@/components/comments/CommentList";
import { CommentInput } from "@/components/comments/CommentInput";
import { ShareDialog } from "@/components/ShareDialog";
import { formatDuration, formatTimestamp } from "@/lib/utils";
import {
  ArrowLeft,
  Edit2,
  Check,
  X,
  Link as LinkIcon,
  MessageSquare,
} from "lucide-react";
import { Id } from "../../../../../../convex/_generated/dataModel";

export default function VideoPage() {
  const params = useParams();
  const teamSlug = params.teamSlug as string;
  const projectId = params.projectId as string;
  const videoId = params.videoId as Id<"videos">;

  const video = useQuery(api.videos.get, { videoId });
  const comments = useQuery(api.comments.list, { videoId });
  const updateVideo = useMutation(api.videos.update);
  const getPlaybackUrl = useAction(api.videoActions.getPlaybackUrl);
  const getDownloadUrl = useAction(api.videoActions.getDownloadUrl);
  const getThumbnailUrls = useAction(api.videoActions.getThumbnailUrls);

  const [currentTime, setCurrentTime] = useState(0);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [highlightedCommentId, setHighlightedCommentId] = useState<Id<"comments"> | undefined>();
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [commentTimestamp, setCommentTimestamp] = useState(0);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const playerRef = useRef<VideoPlayerHandle | null>(null);

  useEffect(() => {
    if (video && video.status === "ready" && video.s3Key) {
      getPlaybackUrl({ videoId })
        .then(({ url }) => {
          setPlaybackError(null);
          setPlaybackUrl(url);
        })
        .catch((err) => {
          setPlaybackError(err.message || "Failed to load video");
        });
    }
  }, [video, videoId, getPlaybackUrl]);

  useEffect(() => {
    if (!video) return;

    if (!video.thumbnailKey && !video.thumbnailUrl) {
      setThumbnailUrl(null);
      return;
    }

    getThumbnailUrls({ videoIds: [videoId] })
      .then((results) => {
        const resolved =
          results[0]?.url ??
          (video.thumbnailUrl?.startsWith("http") ? video.thumbnailUrl : null);
        setThumbnailUrl(resolved);
      })
      .catch((err) => {
        console.error("Failed to load thumbnail:", err);
        setThumbnailUrl(
          video.thumbnailUrl?.startsWith("http") ? video.thumbnailUrl : null,
        );
      });
  }, [video, videoId, getThumbnailUrls]);

  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  const handleMarkerClick = useCallback((comment: { _id: string }) => {
    setHighlightedCommentId(comment._id as Id<"comments">);
    setTimeout(() => setHighlightedCommentId(undefined), 3000);
  }, []);

  const handleTimelineClick = useCallback((time: number) => {
    setCommentTimestamp(time);
    setShowCommentInput(true);
  }, []);

  const requestDownload = useCallback(async () => {
    if (!video || video.status !== "ready") return null;
    try {
      const result = await getDownloadUrl({ videoId });
      return result;
    } catch (error) {
      console.error("Failed to prepare download:", error);
      return null;
    }
  }, [getDownloadUrl, video, videoId]);

  const handleTimestampClick = useCallback(
    (time: number) => {
      playerRef.current?.seekTo(time);
      setHighlightedCommentId(undefined);
    },
    [playerRef, setHighlightedCommentId]
  );

  const handleSaveTitle = async () => {
    if (!editedTitle.trim() || !video) return;
    try {
      await updateVideo({ videoId, title: editedTitle.trim() });
      setIsEditingTitle(false);
    } catch (error) {
      console.error("Failed to update title:", error);
    }
  };

  const startEditingTitle = () => {
    if (video) {
      setEditedTitle(video.title);
      setIsEditingTitle(true);
    }
  };

  if (video === undefined) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-[#888]">Loading...</div>
      </div>
    );
  }

  if (video === null) {
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
          href={`/dashboard/${teamSlug}/${projectId}`}
          className="inline-flex items-center text-sm text-[#888] hover:text-[#1a1a1a] transition-colors mb-3"
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Videos
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
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
          <div className="flex items-center gap-2">
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
                      poster={thumbnailUrl ?? undefined}
                      comments={comments || []}
                      onTimeUpdate={handleTimeUpdate}
                      onMarkerClick={handleMarkerClick}
                      onTimelineClick={handleTimelineClick}
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
                        videoId={videoId}
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
                <div className="max-w-2xl w-full aspect-video bg-[#e8e8e0] flex items-center justify-center border-2 border-[#1a1a1a]">
                  <div className="text-center">
                    {video.status === "uploading" && (
                      <p className="text-[#888]">Uploading...</p>
                    )}
                    {video.status === "processing" && (
                      <p className="text-[#888]">Processing video...</p>
                    )}
                    {video.status === "ready" && !playbackUrl && !playbackError && (
                      <p className="text-[#888]">Loading...</p>
                    )}
                    {video.status === "ready" && playbackError && (
                      <p className="text-[#dc2626]">{playbackError}</p>
                    )}
                    {video.status === "failed" && (
                      <p className="text-[#dc2626]">Processing failed</p>
                    )}
                  </div>
                </div>
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
              videoId={videoId}
              onTimestampClick={handleTimestampClick}
              highlightedCommentId={highlightedCommentId}
              canResolve={canEdit}
            />
          </div>
        </aside>
      </div>

      <ShareDialog
        videoId={videoId}
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
      />
    </div>
  );
}
