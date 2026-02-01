"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropZone } from "@/components/upload/DropZone";
import { UploadProgress, UploadStatus } from "@/components/upload/UploadProgress";
import { UploadButton } from "@/components/upload/UploadButton";
import { formatDuration, formatRelativeTime } from "@/lib/utils";
import { triggerDownload } from "@/lib/download";
import {
  ArrowLeft,
  Play,
  MoreVertical,
  Trash2,
  Link as LinkIcon,
  Grid3X3,
  LayoutList,
  Download,
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
import { cn } from "@/lib/utils";

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

type ViewMode = "grid" | "list";

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
  const getDownloadUrl = useAction(api.videoActions.getDownloadUrl);

  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      for (const file of files) {
        const uploadId = Math.random().toString(36).substring(7);
        const title = file.name.replace(/\.[^/.]+$/, "");
        const abortController = new AbortController();

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

            abortController.signal.addEventListener("abort", () => {
              xhr.abort();
            });

            xhr.open("PUT", url);
            xhr.setRequestHeader("Content-Type", file.type || "video/mp4");
            xhr.send(file);
          });

          await markUploadComplete({ videoId, key });

          setUploads((prev) =>
            prev.map((u) =>
              u.id === uploadId ? { ...u, status: "complete", progress: 100 } : u
            )
          );

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

  const handleDownloadVideo = useCallback(
    async (videoId: Id<"videos">, title: string) => {
      try {
        const result = await getDownloadUrl({ videoId });
        if (result?.url) {
          triggerDownload(result.url, result.filename ?? `${title}.mp4`);
        }
      } catch (error) {
        console.error("Failed to download video:", error);
      }
    },
    [getDownloadUrl]
  );

  if (project === undefined || videos === undefined) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-[#888]">Loading...</div>
      </div>
    );
  }

  if (project === null) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-[#888]">Project not found</div>
      </div>
    );
  }

  const canUpload = project.role !== "viewer";

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="flex-shrink-0 border-b-2 border-[#1a1a1a] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/dashboard/${teamSlug}`}
              className="p-2 -ml-2 text-[#888] hover:text-[#1a1a1a] transition-colors hover:bg-[#e8e8e0]"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-lg font-black text-[#1a1a1a]">{project.name}</h1>
              {project.description && (
                <p className="text-[#888] text-sm">{project.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center border-2 border-[#1a1a1a] p-0.5">
              <button
                onClick={() => setViewMode("grid")}
                className={cn(
                  "p-1.5 transition-colors",
                  viewMode === "grid"
                    ? "bg-[#1a1a1a] text-[#f0f0e8]"
                    : "text-[#888] hover:text-[#1a1a1a]"
                )}
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={cn(
                  "p-1.5 transition-colors",
                  viewMode === "list"
                    ? "bg-[#1a1a1a] text-[#f0f0e8]"
                    : "text-[#888] hover:text-[#1a1a1a]"
                )}
              >
                <LayoutList className="h-4 w-4" />
              </button>
            </div>
            {canUpload && <UploadButton onFilesSelected={handleFilesSelected} />}
          </div>
        </div>
      </header>

      {/* Upload progress */}
      {uploads.length > 0 && (
        <div className="flex-shrink-0 border-b-2 border-[#1a1a1a] px-6 py-4 space-y-3">
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

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {videos.length === 0 && uploads.length === 0 ? (
          <div className="h-full flex items-center justify-center p-6">
            <DropZone
              onFilesSelected={handleFilesSelected}
              disabled={!canUpload}
              className="max-w-xl w-full"
            />
          </div>
        ) : viewMode === "grid" ? (
          /* Grid View - Responsive tiles */
          <div className="p-6">
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
              {videos.map((video) => (
                <div
                  key={video._id}
                  className="group cursor-pointer"
                  onClick={() =>
                    router.push(`/dashboard/${teamSlug}/${projectId}/${video._id}`)
                  }
                >
                  <div className="relative aspect-video bg-[#e8e8e0] overflow-hidden border-2 border-[#1a1a1a] hover:bg-[#1a1a1a] transition-colors">
                    {video.thumbnailUrl ? (
                      <Image
                        src={video.thumbnailUrl}
                        alt={video.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Play className="h-8 w-8 text-[#888]" />
                      </div>
                    )}
                    {video.status === "ready" && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleDownloadVideo(video._id, video.title);
                        }}
                        className="absolute top-1.5 right-1.5 z-10 inline-flex h-8 w-8 items-center justify-center border-2 border-[#1a1a1a] bg-[#f0f0e8] text-[#1a1a1a] opacity-80 transition hover:opacity-100 hover:bg-[#e8e8e0]"
                        aria-label={`Download ${video.title}`}
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    )}
                    {video.status === "ready" && video.duration && (
                      <div className="absolute bottom-1.5 right-1.5 bg-[#1a1a1a] text-[#f0f0e8] text-[10px] font-mono px-1 py-0.5">
                        {formatDuration(video.duration)}
                      </div>
                    )}
                    {video.status !== "ready" && (
                      <div className="absolute inset-0 bg-[#1a1a1a]/60 flex items-center justify-center">
                        <Badge
                          variant={
                            video.status === "failed" ? "destructive" : "secondary"
                          }
                          className="text-[10px]"
                        >
                          {video.status === "uploading" && "Uploading"}
                          {video.status === "processing" && "Processing"}
                          {video.status === "failed" && "Failed"}
                        </Badge>
                      </div>
                    )}
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-[#1a1a1a]/0 group-hover:bg-[#1a1a1a]/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          asChild
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 bg-[#f0f0e8] hover:bg-[#e8e8e0] text-[#1a1a1a]"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {video.status === "ready" && (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleDownloadVideo(video._id, video.title);
                              }}
                            >
                              <Download className="mr-2 h-4 w-4" />
                              Download
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                          >
                            <LinkIcon className="mr-2 h-4 w-4" />
                            Share
                          </DropdownMenuItem>
                          {canUpload && (
                            <DropdownMenuItem
                              className="text-[#dc2626] focus:text-[#dc2626]"
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
                  </div>
                  <div className="mt-1.5 px-0.5">
                    <p className="text-sm text-[#1a1a1a] font-bold truncate">{video.title}</p>
                    <p className="text-[11px] text-[#888] truncate">
                      {formatRelativeTime(video._creationTime)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* List View - Horizontal rows */
          <div className="divide-y-2 divide-[#1a1a1a]">
            {videos.map((video) => (
              <div
                key={video._id}
                className="group flex items-center gap-4 px-6 py-3 hover:bg-[#e8e8e0] cursor-pointer transition-colors"
                onClick={() =>
                  router.push(`/dashboard/${teamSlug}/${projectId}/${video._id}`)
                }
              >
                {/* Thumbnail */}
                <div className="relative w-32 aspect-video bg-[#e8e8e0] overflow-hidden border-2 border-[#1a1a1a] shrink-0">
                  {video.thumbnailUrl ? (
                    <Image
                      src={video.thumbnailUrl}
                      alt={video.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Play className="h-6 w-6 text-[#888]" />
                    </div>
                  )}
                  {video.status !== "ready" && (
                    <div className="absolute inset-0 bg-[#1a1a1a]/60 flex items-center justify-center">
                      <Badge
                        variant={
                          video.status === "failed" ? "destructive" : "secondary"
                        }
                        className="text-[10px]"
                      >
                        {video.status === "uploading" && "Uploading"}
                        {video.status === "processing" && "Processing"}
                        {video.status === "failed" && "Failed"}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[#1a1a1a] truncate">{video.title}</p>
                  <div className="flex items-center gap-3 text-sm text-[#888] mt-0.5">
                    <span>{video.uploaderName}</span>
                    <span className="text-[#ccc]">·</span>
                    <span>{formatRelativeTime(video._creationTime)}</span>
                    {video.duration && (
                      <>
                        <span className="text-[#ccc]">·</span>
                        <span className="font-mono text-xs">{formatDuration(video.duration)}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {video.status === "ready" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDownloadVideo(video._id, video.title);
                      }}
                      aria-label={`Download ${video.title}`}
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      asChild
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {video.status === "ready" && (
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleDownloadVideo(video._id, video.title);
                          }}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                      >
                        <LinkIcon className="mr-2 h-4 w-4" />
                        Share
                      </DropdownMenuItem>
                      {canUpload && (
                        <DropdownMenuItem
                          className="text-[#dc2626] focus:text-[#dc2626]"
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
