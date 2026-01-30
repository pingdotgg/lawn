"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DropZone } from "@/components/upload/DropZone";
import { UploadProgress, UploadStatus } from "@/components/upload/UploadProgress";
import { UploadButton } from "@/components/upload/UploadButton";
import { formatDuration, formatRelativeTime } from "@/lib/utils";
import {
  ArrowLeft,
  Play,
  MoreVertical,
  Trash2,
  Link as LinkIcon,
  MessageSquare,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import Image from "next/image";
import { Id } from "../../../../../convex/_generated/dataModel";

interface UploadItem {
  id: string;
  file: File;
  videoId?: Id<"videos">;
  progress: number;
  status: UploadStatus;
  error?: string;
  s3Key?: string;
  bytesPerSecond?: number;
  estimatedSecondsRemaining?: number | null;
  abortController?: AbortController;
}

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const teamSlug = params.teamSlug as string;
  const projectId = params.projectId as Id<"projects">;

  const project = useQuery(api.projects.get, { projectId });
  const videos = useQuery(api.videos.list, { projectId });
  const createVideo = useMutation(api.videos.create);
  const deleteVideo = useMutation(api.videos.remove);
  const getUploadUrl = useAction(api.videoActions.getUploadUrl);
  const markUploadComplete = useAction(api.videoActions.markUploadComplete);
  const markUploadFailed = useAction(api.videoActions.markUploadFailed);

  const [uploads, setUploads] = useState<UploadItem[]>([]);

  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      for (const file of files) {
        const uploadId = Math.random().toString(36).substring(7);
        const title = file.name.replace(/\.[^/.]+$/, "");
        const abortController = new AbortController();

        // Add to uploads list
        setUploads((prev) => [
          ...prev,
          {
            id: uploadId,
            file,
            progress: 0,
            status: "pending",
            abortController,
          },
        ]);

        try {
          // Create video record
          const videoId = await createVideo({
            projectId,
            title,
            fileSize: file.size,
            contentType: file.type || "video/mp4",
          });

          setUploads((prev) =>
            prev.map((u) =>
              u.id === uploadId ? { ...u, videoId, status: "uploading" } : u
            )
          );

          // Get presigned upload URL
          const { url, key } = await getUploadUrl({
            videoId,
            filename: file.name,
            fileSize: file.size,
            contentType: file.type || "video/mp4",
          });

          setUploads((prev) =>
            prev.map((u) =>
              u.id === uploadId ? { ...u, s3Key: key } : u
            )
          );

          // Upload file with progress tracking using XMLHttpRequest
          await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            const startTime = Date.now();
            let lastTime = startTime;
            let lastLoaded = 0;
            const recentSpeeds: number[] = [];

            xhr.upload.addEventListener("progress", (e) => {
              if (e.lengthComputable) {
                const percentage = Math.round((e.loaded / e.total) * 100);
                const now = Date.now();
                const timeDelta = (now - lastTime) / 1000;
                const bytesDelta = e.loaded - lastLoaded;

                if (timeDelta > 0.1) {
                  const speed = bytesDelta / timeDelta;
                  recentSpeeds.push(speed);
                  if (recentSpeeds.length > 5) recentSpeeds.shift();
                  lastTime = now;
                  lastLoaded = e.loaded;
                }

                const avgSpeed = recentSpeeds.length > 0
                  ? recentSpeeds.reduce((a, b) => a + b, 0) / recentSpeeds.length
                  : 0;
                const remaining = e.total - e.loaded;
                const eta = avgSpeed > 0 ? Math.ceil(remaining / avgSpeed) : null;

                setUploads((prev) =>
                  prev.map((u) =>
                    u.id === uploadId
                      ? {
                          ...u,
                          progress: percentage,
                          bytesPerSecond: avgSpeed,
                          estimatedSecondsRemaining: eta,
                        }
                      : u
                  )
                );
              }
            });

            xhr.addEventListener("load", () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                resolve();
              } else {
                reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
              }
            });

            xhr.addEventListener("error", () => {
              reject(new Error("Upload failed: Network error"));
            });

            xhr.addEventListener("abort", () => {
              reject(new Error("Upload cancelled"));
            });

            // Handle abort
            abortController.signal.addEventListener("abort", () => {
              xhr.abort();
            });

            xhr.open("PUT", url);
            xhr.setRequestHeader("Content-Type", file.type || "video/mp4");
            xhr.send(file);
          });

          // Mark upload as complete
          await markUploadComplete({ videoId, key });

          setUploads((prev) =>
            prev.map((u) =>
              u.id === uploadId ? { ...u, status: "complete", progress: 100 } : u
            )
          );

          // Remove from list after a delay
          setTimeout(() => {
            setUploads((prev) => prev.filter((u) => u.id !== uploadId));
          }, 3000);

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Upload failed";

          setUploads((prev) =>
            prev.map((u) =>
              u.id === uploadId
                ? { ...u, status: "error", error: errorMessage }
                : u
            )
          );

          // Mark as failed in database if we have a videoId
          const upload = uploads.find((u) => u.id === uploadId);
          if (upload?.videoId) {
            markUploadFailed({ videoId: upload.videoId }).catch(console.error);
          }
        }
      }
    },
    [projectId, createVideo, getUploadUrl, markUploadComplete, markUploadFailed, uploads]
  );

  const handleCancelUpload = async (uploadId: string) => {
    const upload = uploads.find((u) => u.id === uploadId);
    if (upload?.abortController) {
      upload.abortController.abort();
    }
    if (upload?.videoId) {
      markUploadFailed({ videoId: upload.videoId }).catch(console.error);
    }
    setUploads((prev) => prev.filter((u) => u.id !== uploadId));
  };

  const handleDeleteVideo = async (videoId: Id<"videos">) => {
    if (!confirm("Are you sure you want to delete this video?")) return;
    try {
      await deleteVideo({ videoId });
    } catch (error) {
      console.error("Failed to delete video:", error);
    }
  };

  if (project === undefined || videos === undefined) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-neutral-500">Loading...</div>
      </div>
    );
  }

  if (project === null) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-neutral-500">Project not found</div>
      </div>
    );
  }

  const canUpload = project.role !== "viewer";

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link
          href={`/dashboard/${teamSlug}`}
          className="inline-flex items-center text-sm text-neutral-500 hover:text-neutral-700 mb-4"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to projects
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{project.name}</h1>
            {project.description && (
              <p className="text-neutral-500 mt-1">{project.description}</p>
            )}
          </div>
          {canUpload && <UploadButton onFilesSelected={handleFilesSelected} />}
        </div>
      </div>

      {/* Upload progress */}
      {uploads.length > 0 && (
        <div className="space-y-2 mb-6">
          {uploads.map((upload) => (
            <UploadProgress
              key={upload.id}
              fileName={upload.file.name}
              fileSize={upload.file.size}
              progress={upload.progress}
              status={upload.status}
              error={upload.error}
              bytesPerSecond={upload.bytesPerSecond}
              estimatedSecondsRemaining={upload.estimatedSecondsRemaining}
              onCancel={() => handleCancelUpload(upload.id)}
            />
          ))}
        </div>
      )}

      {videos.length === 0 && uploads.length === 0 ? (
        <DropZone
          onFilesSelected={handleFilesSelected}
          disabled={!canUpload}
          className="max-w-2xl"
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {videos.map((video) => (
            <Card
              key={video._id}
              className="cursor-pointer hover:shadow-md transition-shadow group overflow-hidden"
              onClick={() =>
                router.push(`/dashboard/${teamSlug}/${projectId}/${video._id}`)
              }
            >
              <div className="relative aspect-video bg-neutral-100">
                {video.thumbnailUrl ? (
                  <Image
                    src={video.thumbnailUrl}
                    alt={video.title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Play className="h-12 w-12 text-neutral-300" />
                  </div>
                )}
                {video.status === "ready" && video.duration && (
                  <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                    {formatDuration(video.duration)}
                  </div>
                )}
                {video.status !== "ready" && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Badge
                      variant={
                        video.status === "failed" ? "destructive" : "secondary"
                      }
                    >
                      {video.status === "uploading" && "Uploading..."}
                      {video.status === "processing" && "Processing..."}
                      {video.status === "failed" && "Failed"}
                    </Badge>
                  </div>
                )}
              </div>
              <CardContent className="p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{video.title}</p>
                    <p className="text-xs text-neutral-500">
                      {video.uploaderName} &middot;{" "}
                      {formatRelativeTime(video._creationTime)}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      asChild
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          // TODO: Open share dialog
                        }}
                      >
                        <LinkIcon className="mr-2 h-4 w-4" />
                        Share
                      </DropdownMenuItem>
                      {canUpload && (
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteVideo(video._id);
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
