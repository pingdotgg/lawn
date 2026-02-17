
import { useAction, useConvex, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Link, useLocation, useNavigate, useOutletContext, useParams } from "react-router";
import { useState, useCallback, useEffect, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { DropZone } from "@/components/upload/DropZone";
import { UploadProgress } from "@/components/upload/UploadProgress";
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
  MessageSquare,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Id } from "@convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { teamHomePath, videoPath } from "@/lib/routes";
import { prefetchHlsRuntime, prefetchMuxPlaybackManifest } from "@/lib/muxPlayback";
import { useRoutePrewarmIntent } from "@/lib/useRoutePrewarmIntent";
import {
  VideoWorkflowStatusControl,
  type VideoWorkflowStatus,
} from "@/components/videos/VideoWorkflowStatusControl";
import { useProjectData } from "./project.data";
import { prewarmTeam } from "./team.data";
import { prewarmVideo } from "./video.data";
import type { DashboardUploadOutletContext } from "./layout";

type ViewMode = "grid" | "list";

type VideoIntentTargetProps = {
  className: string;
  teamSlug: string;
  projectId: Id<"projects">;
  videoId: Id<"videos">;
  muxPlaybackId?: string;
  onOpen: () => void;
  children: ReactNode;
};

function VideoIntentTarget({
  className,
  teamSlug,
  projectId,
  videoId,
  muxPlaybackId,
  onOpen,
  children,
}: VideoIntentTargetProps) {
  const convex = useConvex();
  const prewarmIntentHandlers = useRoutePrewarmIntent(() => {
    prewarmVideo(convex, {
      teamSlug,
      projectId,
      videoId,
    });
    prefetchHlsRuntime();
    if (muxPlaybackId) {
      prefetchMuxPlaybackManifest(muxPlaybackId);
    }
  });

  return (
    <div
      className={className}
      onClick={onOpen}
      {...prewarmIntentHandlers}
    >
      {children}
    </div>
  );
}

export default function ProjectPage() {
  const params = useParams();
  const navigate = useNavigate();
  const pathname = useLocation().pathname;
  const teamSlug = typeof params.teamSlug === "string" ? params.teamSlug : "";
  const projectId = params.projectId as Id<"projects">;
  const convex = useConvex();

  const { context, resolvedProjectId, resolvedTeamSlug, project, videos } =
    useProjectData({ teamSlug, projectId });
  const { requestUpload, uploads, cancelUpload } =
    useOutletContext<DashboardUploadOutletContext>();
  const deleteVideo = useMutation(api.videos.remove);
  const updateVideoWorkflowStatus = useMutation(api.videos.updateWorkflowStatus);
  const getDownloadUrl = useAction(api.videoActions.getDownloadUrl);

  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const shouldCanonicalize =
    !!context && !context.isCanonical && pathname !== context.canonicalPath;
  const prewarmTeamIntentHandlers = useRoutePrewarmIntent(() =>
    prewarmTeam(convex, { teamSlug: resolvedTeamSlug }),
  );

  useEffect(() => {
    if (shouldCanonicalize && context) {
      navigate(context.canonicalPath, { replace: true });
    }
  }, [shouldCanonicalize, context, navigate]);

  const isLoadingData =
    context === undefined ||
    project === undefined ||
    videos === undefined ||
    shouldCanonicalize;

  const handleFilesSelected = useCallback(
    (files: File[]) => {
      if (!resolvedProjectId) return;
      requestUpload(files, resolvedProjectId);
    },
    [requestUpload, resolvedProjectId],
  );
  const projectUploads = resolvedProjectId
    ? uploads.filter((upload) => upload.projectId === resolvedProjectId)
    : [];

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
    [getDownloadUrl],
  );

  const handleUpdateWorkflowStatus = useCallback(
    async (videoId: Id<"videos">, workflowStatus: VideoWorkflowStatus) => {
      try {
        await updateVideoWorkflowStatus({ videoId, workflowStatus });
      } catch (error) {
        console.error("Failed to update video workflow status:", error);
      }
    },
    [updateVideoWorkflowStatus],
  );

  // Not found state
  if (context === null || project === null) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-[#888]">Project not found</div>
      </div>
    );
  }

  const canUpload = project?.role !== "viewer";

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="flex-shrink-0 border-b-2 border-[#1a1a1a] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to={teamHomePath(resolvedTeamSlug)}
              prefetch="intent"
              className="p-2 -ml-2 text-[#888] hover:text-[#1a1a1a] transition-colors hover:bg-[#e8e8e0]"
              {...prewarmTeamIntentHandlers}
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className={cn(
              "transition-opacity duration-300",
              isLoadingData ? "opacity-0" : "opacity-100"
            )}>
              <h1 className="text-lg font-black text-[#1a1a1a]">
                {project?.name ?? "\u00A0"}
              </h1>
              {project?.description && (
                <p className="text-[#888] text-sm">{project.description}</p>
              )}
            </div>
          </div>
          <div className={cn(
            "flex items-center gap-2 transition-opacity duration-300",
            isLoadingData ? "opacity-0" : "opacity-100"
          )}>
            {/* View toggle */}
            <div className="flex items-center border-2 border-[#1a1a1a] p-0.5">
              <button
                onClick={() => setViewMode("grid")}
                className={cn(
                  "p-1.5 transition-colors",
                  viewMode === "grid"
                    ? "bg-[#1a1a1a] text-[#f0f0e8]"
                    : "text-[#888] hover:text-[#1a1a1a]",
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
                    : "text-[#888] hover:text-[#1a1a1a]",
                )}
              >
                <LayoutList className="h-4 w-4" />
              </button>
            </div>
            {canUpload && (
              <UploadButton onFilesSelected={handleFilesSelected} />
            )}
          </div>
        </div>
      </header>

      {/* Upload progress */}
      {projectUploads.length > 0 && (
        <div className="flex-shrink-0 border-b-2 border-[#1a1a1a] px-6 py-4 space-y-3">
          {projectUploads.map((upload) => (
            <UploadProgress
              key={upload.id}
              fileName={upload.file.name}
              fileSize={upload.file.size}
              progress={upload.progress}
              status={upload.status}
              error={upload.error}
              bytesPerSecond={upload.bytesPerSecond}
              estimatedSecondsRemaining={upload.estimatedSecondsRemaining}
              onCancel={() => cancelUpload(upload.id)}
            />
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {!isLoadingData && videos.length === 0 && projectUploads.length === 0 ? (
          <div className="h-full flex items-center justify-center p-6 animate-in fade-in duration-300">
            <DropZone
              onFilesSelected={handleFilesSelected}
              disabled={!canUpload}
              className="max-w-xl w-full"
            />
          </div>
        ) : viewMode === "grid" ? (
          /* Grid View - Responsive tiles */
          <div className={cn(
            "p-6 transition-opacity duration-300",
            isLoadingData ? "opacity-0" : "opacity-100"
          )}>
            <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {videos?.map((video) => {
                const thumbnailSrc = video.thumbnailUrl?.startsWith("http")
                  ? video.thumbnailUrl
                  : undefined;

                return (
                  <VideoIntentTarget
                    key={video._id}
                    className="group cursor-pointer"
                    teamSlug={resolvedTeamSlug}
                    projectId={project._id}
                    videoId={video._id}
                    muxPlaybackId={video.muxPlaybackId}
                    onOpen={() =>
                      navigate(
                        videoPath(resolvedTeamSlug, project._id, video._id),
                      )
                    }
                  >
                    <div className="relative aspect-video bg-[#e8e8e0] overflow-hidden border-2 border-[#1a1a1a] transition-colors">
                      {thumbnailSrc ? (
                        <img
                          src={thumbnailSrc}
                          alt={video.title}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Play className="h-10 w-10 text-[#888]" />
                        </div>
                      )}
                    {video.status === "ready" && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleDownloadVideo(video._id, video.title);
                        }}
                        className="absolute top-2 right-2 z-10 inline-flex h-8 w-8 items-center justify-center bg-[#1a1a1a]/70 text-[#f0f0e8] opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#1a1a1a]/90"
                        aria-label={`Download ${video.title}`}
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    )}
                    {video.status === "ready" && video.duration && (
                      <div className="absolute bottom-2 right-2 bg-[#1a1a1a]/80 text-[#f0f0e8] text-[11px] font-mono px-1.5 py-0.5">
                        {formatDuration(video.duration)}
                      </div>
                    )}
                    {video.status !== "ready" && (
                      <div className="absolute inset-0 bg-[#1a1a1a]/60 flex items-center justify-center">
                        <span className="text-[#f0f0e8] text-xs font-bold uppercase tracking-wider">
                          {video.status === "uploading" && "Uploading..."}
                          {video.status === "processing" && "Processing..."}
                          {video.status === "failed" && "Failed"}
                        </span>
                      </div>
                    )}
                    {/* Hover overlay with menu */}
                    <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          asChild
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 bg-[#1a1a1a]/70 hover:bg-[#1a1a1a]/90 text-[#f0f0e8]"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          {video.status === "ready" && (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleDownloadVideo(
                                  video._id,
                                  video.title,
                                );
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
                  <div className="mt-2.5">
                    <p className="text-[15px] text-[#1a1a1a] font-black truncate leading-tight">
                      {video.title}
                    </p>
                    <div className="mt-1.5 flex items-center gap-3">
                      <VideoWorkflowStatusControl
                        status={video.workflowStatus}
                        stopPropagation
                        onChange={(workflowStatus) =>
                          void handleUpdateWorkflowStatus(video._id, workflowStatus)
                        }
                      />
                      {video.commentCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-[#888]">
                          <MessageSquare className="h-3 w-3" />
                          {video.commentCount}
                        </span>
                      )}
                      <span className="text-[11px] text-[#1a1a1a]/50 ml-auto font-mono">
                        {formatRelativeTime(video._creationTime)}
                      </span>
                    </div>
                  </div>
                  </VideoIntentTarget>
                );
              })}
            </div>
          </div>
        ) : (
          /* List View - Horizontal rows */
          <div className={cn(
            "divide-y-2 divide-[#1a1a1a] transition-opacity duration-300",
            isLoadingData ? "opacity-0" : "opacity-100"
          )}>
            {videos?.map((video) => {
              const thumbnailSrc = video.thumbnailUrl?.startsWith("http")
                ? video.thumbnailUrl
                : undefined;

              return (
                <VideoIntentTarget
                  key={video._id}
                  className="group flex items-center gap-5 px-6 py-3 hover:bg-[#e8e8e0] cursor-pointer transition-colors"
                  teamSlug={resolvedTeamSlug}
                  projectId={project._id}
                  videoId={video._id}
                  muxPlaybackId={video.muxPlaybackId}
                  onOpen={() =>
                    navigate(
                      videoPath(resolvedTeamSlug, project._id, video._id),
                    )
                  }
                >
                  {/* Thumbnail */}
                  <div className="relative w-44 aspect-video bg-[#e8e8e0] overflow-hidden border-2 border-[#1a1a1a] shrink-0">
                    {thumbnailSrc ? (
                      <img
                        src={thumbnailSrc}
                        alt={video.title}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Play className="h-6 w-6 text-[#888]" />
                      </div>
                    )}
                    {video.status !== "ready" && (
                      <div className="absolute inset-0 bg-[#1a1a1a]/60 flex items-center justify-center">
                        <span className="text-[#f0f0e8] text-[10px] font-bold uppercase tracking-wider">
                          {video.status === "uploading" && "Uploading..."}
                          {video.status === "processing" && "Processing..."}
                          {video.status === "failed" && "Failed"}
                        </span>
                      </div>
                    )}
                    {video.status === "ready" && video.duration && (
                      <div className="absolute bottom-1 right-1 bg-[#1a1a1a]/80 text-[#f0f0e8] text-[10px] font-mono px-1 py-0.5">
                        {formatDuration(video.duration)}
                      </div>
                    )}
                  </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-black text-[#1a1a1a] truncate">
                    {video.title}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <VideoWorkflowStatusControl
                      status={video.workflowStatus}
                      stopPropagation
                      onChange={(workflowStatus) =>
                        void handleUpdateWorkflowStatus(video._id, workflowStatus)
                      }
                    />
                    {video.commentCount > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs text-[#888]">
                        <MessageSquare className="h-3.5 w-3.5" />
                        {video.commentCount}
                      </span>
                    )}
                    <span className="text-xs text-[#1a1a1a]/40 font-mono">
                      {formatRelativeTime(video._creationTime)}
                    </span>
                    {video.uploaderName && (
                      <span className="text-xs text-[#888]">
                        {video.uploaderName}
                      </span>
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
                </VideoIntentTarget>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
