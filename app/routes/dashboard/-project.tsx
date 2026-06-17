
import { useAction, useConvex, useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { DropZone } from "@/components/upload/DropZone";
import { UploadButton } from "@/components/upload/UploadButton";
import { formatDuration, formatRelativeTime } from "@/lib/utils";
import { triggerDownload } from "@/lib/download";
import {
  Play,
  MoreVertical,
  Trash2,
  Link as LinkIcon,
  Grid3X3,
  LayoutList,
  Download,
  MessageSquare,
  Eye,
  FolderPlus,
  FolderInput,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Id } from "@convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { projectPath, teamHomePath, videoPath } from "@/lib/routes";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { MoveProjectDialog } from "@/components/projects/MoveProjectDialog";
import { MoveVideoDialog } from "@/components/videos/MoveVideoDialog";
import { useMoveActions } from "@/lib/dnd/useMoveActions";
import { useDraggableCard } from "@/lib/dnd/useDraggableCard";
import type { DragPayload } from "@/lib/dnd/payload";
import { prefetchHlsRuntime, prefetchMuxPlaybackManifest } from "@/lib/muxPlayback";
import { useRoutePrewarmIntent } from "@/lib/useRoutePrewarmIntent";
import {
  VideoWorkflowStatusControl,
  type VideoWorkflowStatus,
} from "@/components/videos/VideoWorkflowStatusControl";
import { useProjectData } from "./-project.data";
import { prewarmTeam } from "./-team.data";
import { prewarmVideo } from "./-video.data";
import { useDashboardUploadContext } from "@/lib/dashboardUploadContext";
import { DashboardHeader } from "@/components/DashboardHeader";

type ViewMode = "grid" | "list";
type ShareToastState = {
  tone: "success" | "error";
  message: string;
};

async function copyTextToClipboard(text: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  if (typeof document === "undefined") {
    return false;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  let copied = false;
  try {
    copied = document.execCommand("copy");
  } finally {
    document.body.removeChild(textarea);
  }

  return copied;
}

type VideoIntentTargetProps = {
  className: string;
  teamSlug: string;
  projectId: Id<"projects">;
  videoId: Id<"videos">;
  muxPlaybackId?: string;
  onOpen: () => void;
  children: ReactNode;
  dragPayload: DragPayload;
  dragDisabled?: boolean;
};

function VideoIntentTarget({
  className,
  teamSlug,
  projectId,
  videoId,
  muxPlaybackId,
  onOpen,
  children,
  dragPayload,
  dragDisabled,
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
  const { ref: dragRef, isDragging } = useDraggableCard<HTMLDivElement>({
    payload: dragPayload,
    disabled: dragDisabled,
  });

  return (
    <div
      ref={dragRef}
      className={cn(className, isDragging && "opacity-50")}
      onClick={onOpen}
      {...prewarmIntentHandlers}
    >
      {children}
    </div>
  );
}

export default function ProjectPage({
  teamSlug,
  projectId,
}: {
  teamSlug: string;
  projectId: Id<"projects">;
}) {
  const navigate = useNavigate({});
  const pathname = useLocation().pathname;
  const convex = useConvex();

  const {
    context,
    resolvedProjectId,
    resolvedTeamSlug,
    project,
    videos,
    childFolders,
    breadcrumb,
  } = useProjectData({ teamSlug, projectId });
  const projectPresenceCounts = useQuery(
    api.videoPresence.listProjectOnlineCounts,
    resolvedProjectId ? { projectId: resolvedProjectId } : "skip",
  );
  const { requestUpload } = useDashboardUploadContext();
  const deleteVideo = useMutation(api.videos.remove);
  const updateVideoWorkflowStatus = useMutation(api.videos.updateWorkflowStatus);
  const getDownloadUrl = useAction(api.videoActions.getDownloadUrl);
  const createFolder = useMutation(api.projects.create);
  const deleteFolder = useMutation(api.projects.remove);

  const teamId = context?.team?._id;
  const { moveFromDrop } = useMoveActions();
  const folders = useQuery(
    api.projects.listForMove,
    teamId ? { teamId } : "skip",
  );

  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [shareToast, setShareToast] = useState<ShareToastState | null>(null);
  const shareToastTimeoutRef = useRef<number | null>(null);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [moveTarget, setMoveTarget] = useState<{
    _id: Id<"projects">;
    name: string;
  } | null>(null);
  const [moveVideoTarget, setMoveVideoTarget] = useState<{
    _id: Id<"videos">;
    title: string;
    projectId: Id<"projects">;
  } | null>(null);
  const [dndError, setDndError] = useState<string | null>(null);

  const handleDropMove = (
    payload: DragPayload,
    destProjectId?: Id<"projects">,
  ) => {
    void moveFromDrop(payload, destProjectId).then((result) => {
      setDndError(result.error ?? null);
    });
  };

  // Auto-dismiss the drop error, matching the share-toast behavior.
  useEffect(() => {
    if (!dndError) return;
    const timeout = window.setTimeout(() => setDndError(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [dndError]);

  const shouldCanonicalize =
    !!context && !context.isCanonical && pathname !== context.canonicalPath;
  const prewarmTeamIntentHandlers = useRoutePrewarmIntent(() =>
    prewarmTeam(convex, { teamSlug: resolvedTeamSlug }),
  );

  useEffect(() => {
    if (shouldCanonicalize && context) {
      navigate({ to: context.canonicalPath, replace: true });
    }
  }, [shouldCanonicalize, context, navigate]);

  useEffect(
    () => () => {
      if (shareToastTimeoutRef.current !== null) {
        window.clearTimeout(shareToastTimeoutRef.current);
      }
    },
    [],
  );

  const isLoadingData =
    context === undefined ||
    project === undefined ||
    videos === undefined ||
    childFolders === undefined ||
    breadcrumb === undefined ||
    shouldCanonicalize;

  const handleFilesSelected = useCallback(
    (files: File[]) => {
      if (!resolvedProjectId) return;
      requestUpload(files, resolvedProjectId);
    },
    [requestUpload, resolvedProjectId],
  );

  const handleDeleteVideo = async (videoId: Id<"videos">) => {
    if (!confirm("Are you sure you want to delete this video?")) return;
    try {
      await deleteVideo({ videoId });
    } catch (error) {
      console.error("Failed to delete video:", error);
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim() || !teamId || !resolvedProjectId) return;

    setIsCreatingFolder(true);
    try {
      const newId = await createFolder({
        teamId,
        name: newFolderName.trim(),
        parentId: resolvedProjectId,
      });
      setCreateFolderOpen(false);
      setNewFolderName("");
      navigate({ to: projectPath(resolvedTeamSlug, newId) });
    } catch (error) {
      console.error("Failed to create folder:", error);
      window.alert(
        error instanceof Error ? error.message : "Failed to create folder",
      );
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleDeleteFolder = async (childId: Id<"projects">) => {
    if (
      !confirm(
        "Delete this folder and everything inside it (sub-folders and videos)? This can't be undone.",
      )
    )
      return;
    try {
      await deleteFolder({ projectId: childId });
    } catch (error) {
      console.error("Failed to delete folder:", error);
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

  const showShareToast = useCallback((tone: ShareToastState["tone"], message: string) => {
    setShareToast({ tone, message });
    if (shareToastTimeoutRef.current !== null) {
      window.clearTimeout(shareToastTimeoutRef.current);
    }
    shareToastTimeoutRef.current = window.setTimeout(() => {
      setShareToast(null);
      shareToastTimeoutRef.current = null;
    }, 2400);
  }, []);

  const handleShareVideo = useCallback(
    async (video: {
      _id: Id<"videos">;
      publicId?: string;
      status: string;
      visibility: "public" | "private";
    }) => {
      const canSharePublicly =
        Boolean(video.publicId) &&
        video.status === "ready" &&
        video.visibility === "public";
      const path = canSharePublicly
        ? `/watch/${video.publicId}`
        : videoPath(resolvedTeamSlug, projectId, video._id);
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const url = `${origin}${path}`;

      try {
        const copied = await copyTextToClipboard(url);
        if (!copied) {
          showShareToast("error", "Could not copy link");
          return;
        }
        showShareToast(
          "success",
          canSharePublicly
            ? "Share link copied"
            : "Video link copied (public watch link not available yet)",
        );
      } catch {
        showShareToast("error", "Could not copy link");
      }
    },
    [projectId, resolvedTeamSlug, showShareToast],
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
  const hasChildFolders = (childFolders?.length ?? 0) > 0;
  const hasVideos = (videos?.length ?? 0) > 0;
  const showEmptyDropzone = !isLoadingData && !hasVideos && !hasChildFolders;
  const breadcrumbSegments =
    breadcrumb ??
    (project
      ? [{ _id: project._id, name: project.name }]
      : [{ _id: projectId, name: " " }]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <DashboardHeader paths={[
        {
          label: resolvedTeamSlug,
          href: teamHomePath(resolvedTeamSlug),
          prewarmIntentHandlers: prewarmTeamIntentHandlers,
          // Drop a folder here to move it to the top level (videos can't go
          // to top level — canDrop rejects them).
          drop: teamId
            ? {
                teamId,
                targetProjectId: undefined,
                folders,
                disabled: !canUpload,
                onDropMove: (payload) => handleDropMove(payload, undefined),
              }
            : undefined,
        },
        ...breadcrumbSegments.map((segment, index) =>
          index === breadcrumbSegments.length - 1
            ? { label: segment.name }
            : {
                label: segment.name,
                href: projectPath(resolvedTeamSlug, segment._id),
                // Drop an item onto an ancestor crumb to move it "up" into
                // that folder.
                drop: teamId
                  ? {
                      teamId,
                      targetProjectId: segment._id,
                      folders,
                      disabled: !canUpload,
                      onDropMove: (payload: DragPayload) =>
                        handleDropMove(payload, segment._id),
                    }
                  : undefined,
              },
        ),
      ]}>
        <div className={cn(
          "flex items-center gap-2 transition-opacity duration-300 flex-shrink-0",
          isLoadingData ? "opacity-0" : "opacity-100"
        )}>
          {canUpload && (
            <Button variant="outline" onClick={() => setCreateFolderOpen(true)}>
              <FolderPlus className="sm:mr-1.5 h-4 w-4" />
              <span className="hidden sm:inline">New folder</span>
            </Button>
          )}
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
      </DashboardHeader>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {hasChildFolders && (
          <div
            className={cn(
              "p-6 transition-opacity duration-300",
              hasVideos ? "pb-0" : "",
              isLoadingData ? "opacity-0" : "opacity-100",
            )}
          >
            <h2 className="text-xs font-black uppercase tracking-wider text-[#888] mb-3">
              Folders
            </h2>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {childFolders?.map((child) => (
                <ProjectCard
                  key={child._id}
                  teamSlug={resolvedTeamSlug}
                  project={child}
                  onOpen={() =>
                    navigate({ to: projectPath(resolvedTeamSlug, child._id) })
                  }
                  onDelete={canUpload ? handleDeleteFolder : undefined}
                  onMove={canUpload ? (p) => setMoveTarget(p) : undefined}
                  dnd={
                    teamId
                      ? {
                          teamId,
                          currentParentId: resolvedProjectId,
                          folders,
                          disabled: !canUpload,
                          onDropMove: handleDropMove,
                        }
                      : undefined
                  }
                />
              ))}
            </div>
          </div>
        )}
        {showEmptyDropzone ? (
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
                const canDownload = Boolean(video.s3Key) && video.status !== "failed" && video.status !== "uploading";
                const watchingCount =
                  projectPresenceCounts?.counts?.[video._id] ?? 0;

                return (
                  <VideoIntentTarget
                    key={video._id}
                    className="group cursor-pointer flex flex-col"
                    teamSlug={resolvedTeamSlug}
                    projectId={project._id}
                    videoId={video._id}
                    muxPlaybackId={video.muxPlaybackId}
                    dragDisabled={!canUpload || !teamId || !resolvedProjectId}
                    dragPayload={{
                      kind: "video",
                      videoId: video._id,
                      sourceProjectId: resolvedProjectId as Id<"projects">,
                      teamId: teamId as Id<"teams">,
                      title: video.title,
                    }}
                    onOpen={() =>
                      navigate({
                        to: videoPath(resolvedTeamSlug, project._id, video._id),
                      })
                    }
                  >
                    <div className="relative aspect-video bg-[#e8e8e0] overflow-hidden border-2 border-[#1a1a1a] shadow-[4px_4px_0px_0px_var(--shadow-color)] group-hover:translate-y-[2px] group-hover:translate-x-[2px] group-hover:shadow-[2px_2px_0px_0px_var(--shadow-color)] transition-all">
                      {thumbnailSrc ? (
                        <img
                          src={thumbnailSrc}
                          alt={video.title}
                          draggable={false}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Play className="h-10 w-10 text-[#888]" />
                        </div>
                      )}
                    {video.status === "ready" && video.duration && (
                      <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[11px] font-mono px-1.5 py-0.5">
                        {formatDuration(video.duration)}
                      </div>
                    )}
                    {video.status !== "ready" && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="text-white text-xs font-bold uppercase tracking-wider">
                          {video.status === "uploading" && "Uploading..."}
                          {video.status === "processing" && "Processing..."}
                          {video.status === "failed" && "Failed"}
                        </span>
                      </div>
                    )}
                    {/* Hover menu */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          asChild
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center bg-black/60 hover:bg-black/80 text-white"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canDownload && (
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
                              void handleShareVideo(video);
                            }}
                          >
                            <LinkIcon className="mr-2 h-4 w-4" />
                            Share
                          </DropdownMenuItem>
                          {canUpload && (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setMoveVideoTarget({
                                  _id: video._id,
                                  title: video.title,
                                  projectId: project._id,
                                });
                              }}
                            >
                              <FolderInput className="mr-2 h-4 w-4" />
                              Move
                            </DropdownMenuItem>
                          )}
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
                        disabled={!canUpload}
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
                      {watchingCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-[#1a1a1a]">
                          <Eye className="h-3 w-3" />
                          {watchingCount}
                        </span>
                      )}
                      <span className="text-[11px] text-[#888] ml-auto font-mono">
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
              const canDownload = Boolean(video.s3Key) && video.status !== "failed" && video.status !== "uploading";
              const watchingCount =
                projectPresenceCounts?.counts?.[video._id] ?? 0;

              return (
                <VideoIntentTarget
                  key={video._id}
                  className="group flex items-center gap-5 px-6 py-3 hover:bg-[#e8e8e0] cursor-pointer transition-colors"
                  teamSlug={resolvedTeamSlug}
                  projectId={project._id}
                  videoId={video._id}
                  muxPlaybackId={video.muxPlaybackId}
                  dragDisabled={!canUpload || !teamId || !resolvedProjectId}
                  dragPayload={{
                    kind: "video",
                    videoId: video._id,
                    sourceProjectId: resolvedProjectId as Id<"projects">,
                    teamId: teamId as Id<"teams">,
                    title: video.title,
                  }}
                  onOpen={() =>
                    navigate({
                      to: videoPath(resolvedTeamSlug, project._id, video._id),
                    })
                  }
                >
                  {/* Thumbnail */}
                  <div className="relative w-44 aspect-video bg-[#e8e8e0] overflow-hidden border-2 border-[#1a1a1a] shrink-0 shadow-[4px_4px_0px_0px_var(--shadow-color)] group-hover:translate-y-[2px] group-hover:translate-x-[2px] group-hover:shadow-[2px_2px_0px_0px_var(--shadow-color)] transition-all">
                    {thumbnailSrc ? (
                      <img
                        src={thumbnailSrc}
                        alt={video.title}
                        draggable={false}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Play className="h-6 w-6 text-[#888]" />
                      </div>
                    )}
                    {video.status !== "ready" && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="text-white text-[10px] font-bold uppercase tracking-wider">
                          {video.status === "uploading" && "Uploading..."}
                          {video.status === "processing" && "Processing..."}
                          {video.status === "failed" && "Failed"}
                        </span>
                      </div>
                    )}
                    {video.status === "ready" && video.duration && (
                      <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] font-mono px-1 py-0.5">
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
                      disabled={!canUpload}
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
                    {watchingCount > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs text-[#1a1a1a]">
                        <Eye className="h-3.5 w-3.5" />
                        {watchingCount}
                      </span>
                    )}
                    <span className="text-xs text-[#888] font-mono">
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
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      asChild
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        className="inline-flex h-8 w-8 cursor-pointer items-center justify-center text-[#888] hover:text-[#1a1a1a]"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {canDownload && (
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
                          void handleShareVideo(video);
                        }}
                      >
                        <LinkIcon className="mr-2 h-4 w-4" />
                        Share
                      </DropdownMenuItem>
                      {canUpload && (
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setMoveVideoTarget({
                              _id: video._id,
                              title: video.title,
                              projectId: project._id,
                            });
                          }}
                        >
                          <FolderInput className="mr-2 h-4 w-4" />
                          Move
                        </DropdownMenuItem>
                      )}
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

      {shareToast ? (
        <div className="fixed right-4 top-4 z-50" aria-live="polite">
          <div
            className={cn(
              "border-2 px-3 py-2 text-sm font-bold shadow-[4px_4px_0px_0px_var(--shadow-color)]",
              shareToast.tone === "success"
                ? "border-[#1a1a1a] bg-[#f0f0e8] text-[#1a1a1a]"
                : "border-[#dc2626] bg-[#fef2f2] text-[#dc2626]",
            )}
          >
            {shareToast.message}
          </div>
        </div>
      ) : null}

      {dndError ? (
        <div className="fixed right-4 top-16 z-50" aria-live="polite">
          <button
            type="button"
            onClick={() => setDndError(null)}
            className="border-2 border-[#dc2626] bg-[#fef2f2] px-3 py-2 text-sm font-bold text-[#dc2626] shadow-[4px_4px_0px_0px_var(--shadow-color)]"
          >
            {dndError}
          </button>
        </div>
      ) : null}

      <Dialog open={createFolderOpen} onOpenChange={setCreateFolderOpen}>
        <DialogContent>
          <form onSubmit={handleCreateFolder}>
            <DialogHeader>
              <DialogTitle>New folder</DialogTitle>
              <DialogDescription>
                Create a folder inside {project?.name ?? "this folder"} to
                organize videos and sub-folders.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Input
                placeholder="Folder name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateFolderOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!newFolderName.trim() || isCreatingFolder}
              >
                {isCreatingFolder ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {teamId && (
        <MoveProjectDialog
          teamId={teamId}
          project={moveTarget}
          open={moveTarget !== null}
          onOpenChange={(open) => {
            if (!open) setMoveTarget(null);
          }}
        />
      )}

      {teamId && (
        <MoveVideoDialog
          teamId={teamId}
          video={moveVideoTarget}
          open={moveVideoTarget !== null}
          onOpenChange={(open) => {
            if (!open) setMoveVideoTarget(null);
          }}
        />
      )}
    </div>
  );
}
