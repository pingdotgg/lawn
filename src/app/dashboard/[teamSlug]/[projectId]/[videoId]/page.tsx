"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { VideoPlayer } from "@/components/video-player/VideoPlayer";
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
  Download,
  MessageSquare,
} from "lucide-react";
import { Id } from "../../../../../../convex/_generated/dataModel";

export default function VideoPage() {
  const params = useParams();
  const router = useRouter();
  const teamSlug = params.teamSlug as string;
  const projectId = params.projectId as string;
  const videoId = params.videoId as Id<"videos">;

  const video = useQuery(api.videos.get, { videoId });
  const comments = useQuery(api.comments.list, { videoId });
  const updateVideo = useMutation(api.videos.update);
  const getPlaybackUrl = useAction(api.videoActions.getPlaybackUrl);

  const [currentTime, setCurrentTime] = useState(0);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [highlightedCommentId, setHighlightedCommentId] = useState<Id<"comments"> | undefined>();
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [commentTimestamp, setCommentTimestamp] = useState(0);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  // Fetch presigned playback URL when video is ready
  useEffect(() => {
    if (video && video.status === "ready" && video.s3Key) {
      setPlaybackUrl(null);
      setPlaybackError(null);
      getPlaybackUrl({ videoId })
        .then(({ url }) => setPlaybackUrl(url))
        .catch((err) => setPlaybackError(err.message || "Failed to load video"));
    }
  }, [video, videoId, getPlaybackUrl]);

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

  const handleTimestampClick = useCallback((seconds: number) => {
    // This will be handled by VideoPlayer seeking
    setHighlightedCommentId(undefined);
  }, []);

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
        <div className="animate-pulse text-neutral-500">Loading...</div>
      </div>
    );
  }

  if (video === null) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-neutral-500">Video not found</div>
      </div>
    );
  }

  const canEdit = video.role !== "viewer";
  const canComment = true; // All team members can comment

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <Link
          href={`/dashboard/${teamSlug}/${projectId}`}
          className="inline-flex items-center text-sm text-neutral-500 hover:text-neutral-700 mb-2"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to videos
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
                <h1 className="text-xl font-bold">{video.title}</h1>
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
                {video.status === "uploading" && "Uploading..."}
                {video.status === "processing" && "Processing..."}
                {video.status === "failed" && "Failed"}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setShareDialogOpen(true)}>
              <LinkIcon className="mr-2 h-4 w-4" />
              Share
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-2 text-sm text-neutral-500">
          <span>Uploaded by {video.uploaderName}</span>
          {video.duration && <span>{formatDuration(video.duration)}</span>}
          <span>{comments?.length || 0} comments</span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video player */}
        <div className="flex-1 p-6 overflow-auto">
          {video.status === "ready" && playbackUrl ? (
            <div className="max-w-4xl mx-auto">
              <VideoPlayer
                src={playbackUrl}
                poster={video.thumbnailUrl}
                comments={comments || []}
                onTimeUpdate={handleTimeUpdate}
                onMarkerClick={handleMarkerClick}
                onTimelineClick={handleTimelineClick}
              />

              {/* Comment input overlay */}
              {showCommentInput && canComment && (
                <div className="mt-4 p-4 bg-neutral-50 rounded-lg">
                  <CommentInput
                    videoId={videoId}
                    timestampSeconds={commentTimestamp}
                    showTimestamp
                    autoFocus
                    onSubmit={() => setShowCommentInput(false)}
                    onCancel={() => setShowCommentInput(false)}
                  />
                </div>
              )}

              {/* Quick comment button */}
              {!showCommentInput && canComment && (
                <div className="mt-4 flex items-center justify-between">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setCommentTimestamp(currentTime);
                      setShowCommentInput(true);
                    }}
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Comment at {formatTimestamp(currentTime)}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="max-w-4xl mx-auto aspect-video bg-neutral-100 rounded-lg flex items-center justify-center">
              <div className="text-center">
                {video.status === "uploading" && (
                  <p className="text-neutral-500">Video is uploading...</p>
                )}
                {video.status === "processing" && (
                  <p className="text-neutral-500">
                    Video is processing. This may take a few minutes.
                  </p>
                )}
                {video.status === "ready" && !playbackUrl && !playbackError && (
                  <p className="text-neutral-500">Loading video...</p>
                )}
                {video.status === "ready" && playbackError && (
                  <p className="text-red-500">
                    {playbackError}
                  </p>
                )}
                {video.status === "failed" && (
                  <p className="text-red-500">
                    Video processing failed. Please try uploading again.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Comments sidebar */}
        <div className="w-96 border-l flex flex-col">
          <div className="p-4 border-b">
            <h2 className="font-semibold flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Comments
              {comments && comments.length > 0 && (
                <Badge variant="secondary">{comments.length}</Badge>
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
        </div>
      </div>

      <ShareDialog
        videoId={videoId}
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
      />
    </div>
  );
}
