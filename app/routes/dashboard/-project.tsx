import { useAction, useConvex, useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useState, useCallback, useEffect, useMemo, useRef, type ReactNode } from "react";
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
  Share2,
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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Id } from "@convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { projectPath, teamHomePath, videoPath, watchPath } from "@/lib/routes";
import { copyTextToClipboard } from "@/lib/clipboard";
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
import { createRequestEpoch } from "@/lib/requestEpoch";
import { DashboardSortControl } from "@/components/DashboardSortControl";
import { ExpandableTitle } from "@/components/ExpandableTitle";
import { FolderShareDialog } from "@/components/projects/FolderShareDialog";
import { sortDashboardItems, type DashboardSort } from "@/lib/dashboardSort";

type ViewMode = "grid" | "list";
type ShareToastState = {
  tone: "success" | "error";
  message: string;
  url?: string;
};

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
      className={cn("relative", className, isDragging && "opacity-50")}
      onClick={onOpen}
      {...prewarmIntentHandlers}
    >
      <button
        type="button"
        className="pointer-events-none absolute inset-0 z-20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d5a2d]"
        aria-label={dragPayload.kind === "video" ? `Open video ${dragPayload.title}` : "Open video"}
        onClick={(event) => {
          event.stopPropagation();
          onOpen();
        }}
      />
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
  const [sort, setSort] = useState<DashboardSort>("last-uploaded");

  const {
    context,
    resolvedProjectId,
    resolvedTeamSlug,
    project,
    videos,
    videosStatus,
    videosSortPending,
    loadMoreVideos,
    childFolders,
    breadcrumb,
  } = useProjectData({ teamSlug, projectId, sort });
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

  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [shareToast, setShareToast] = useState<ShareToastState | null>(null);
  const shareToastTimeoutRef = useRef<number | null>(null);
  const shareRequestEpochRef = useRef(createRequestEpoch());
  const sharePendingRef = useRef(false);
  const [sharePending, setSharePending] = useState(false);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [folderShareProjectId, setFolderShareProjectId] = useState<Id<"projects"> | null>(null);
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
    versionNumber: number;
  } | null>(null);
  const [dndError, setDndError] = useState<string | null>(null);
  const sortedChildFolders = useMemo(
    () => sortDashboardItems(childFolders ?? [], sort),
    [childFolders, sort],
  );

  const handleDropMove = (payload: DragPayload, destProjectId?: Id<"projects">) => {
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

  useEffect(() => {
    setFolderShareProjectId(null);
  }, [projectId]);

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
      shareRequestEpochRef.current.invalidate();
      if (shareToastTimeoutRef.current !== null) {
        window.clearTimeout(shareToastTimeoutRef.current);
      }
    },
    [],
  );

  const isLoadingData =
    context === undefined ||
    project === undefined ||
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

  const handleDeleteVideo = async (videoId: Id<"videos">, versionNumber: number) => {
    if (
      !confirm(
        `Delete the latest version (v${versionNumber})? Its comments and share links will be deleted. The previous version will become latest.`,
      )
    )
      return;
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
      await createFolder({
        teamId,
        name: newFolderName.trim(),
        parentId: resolvedProjectId,
      });
      setCreateFolderOpen(false);
      setNewFolderName("");
    } catch (error) {
      console.error("Failed to create folder:", error);
      window.alert(error instanceof Error ? error.message : "Failed to create folder");
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

  const showShareToast = useCallback((toast: ShareToastState, autoDismiss: boolean) => {
    setShareToast(toast);
    if (shareToastTimeoutRef.current !== null) {
      window.clearTimeout(shareToastTimeoutRef.current);
      shareToastTimeoutRef.current = null;
    }
    if (autoDismiss) {
      shareToastTimeoutRef.current = window.setTimeout(() => {
        setShareToast(null);
        shareToastTimeoutRef.current = null;
      }, 2400);
    }
  }, []);

  const handleShareVideo = useCallback(
    async (video: { _id: Id<"videos">; publicId?: string; visibility: "public" | "private" }) => {
      if (sharePendingRef.current) return;
      sharePendingRef.current = true;
      setSharePending(true);
      setShareToast(null);
      const requestEpoch = shareRequestEpochRef.current.next();
      const publicWatchPath =
        video.visibility === "public" && video.publicId ? watchPath(video.publicId) : null;
      const path = publicWatchPath ?? videoPath(resolvedTeamSlug, projectId, video._id);
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const url = `${origin}${path}`;

      try {
        const copied = await copyTextToClipboard(url);
        if (!shareRequestEpochRef.current.isCurrent(requestEpoch)) return;
        sharePendingRef.current = false;
        setSharePending(false);
        if (!copied) {
          showShareToast({ tone: "error", message: "Could not copy link", url }, false);
          return;
        }
        showShareToast(
          {
            tone: "success",
            message: publicWatchPath ? "Share link copied" : "Private dashboard link copied",
          },
          true,
        );
      } catch {
        if (!shareRequestEpochRef.current.isCurrent(requestEpoch)) return;
        sharePendingRef.current = false;
        setSharePending(false);
        showShareToast({ tone: "error", message: "Could not copy link", url }, false);
      }
    },
    [projectId, resolvedTeamSlug, showShareToast],
  );

  // Not found state
  if (context === null || project === null) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-[#888]">Project not found</div>
      </div>
    );
  }

  const canUpload = Boolean(project && project.role !== "viewer");
  const canDeleteVideo = project?.role === "owner" || project?.role === "admin";
  const activeProjectId = project?._id ?? resolvedProjectId ?? projectId;
  const hasChildFolders = (childFolders?.length ?? 0) > 0;
  const hasVideos = (videos?.length ?? 0) > 0;
  const showEmptyDropzone = !isLoadingData && !videosSortPending && !hasVideos && !hasChildFolders;
  const breadcrumbSegments =
    breadcrumb ??
    (project ? [{ _id: activeProjectId, name: project.name }] : [{ _id: projectId, name: " " }]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <DashboardHeader
        paths={[
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
                        disabled: !canUpload,
                        onDropMove: (payload: DragPayload) => handleDropMove(payload, segment._id),
                      }
                    : undefined,
                },
          ),
        ]}
      >
        <div
          className={cn(
            "flex flex-shrink-0 items-center gap-2 transition-opacity duration-300",
            isLoadingData ? "opacity-0" : "opacity-100",
          )}
        >
          <DashboardSortControl value={sort} onChange={setSort} />
          {canUpload && (
            <Button
              variant="outline"
              aria-label="Share folder"
              onClick={() => setFolderShareProjectId(activeProjectId)}
            >
              <Share2 className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Share folder</span>
            </Button>
          )}
          {canUpload && (
            <Button variant="outline" onClick={() => setCreateFolderOpen(true)}>
              <FolderPlus className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">New folder</span>
            </Button>
          )}
          {/* View toggle */}
          <div className="flex items-center border-2 border-[#1a1a1a] p-0.5">
            <button
              type="button"
              aria-label="Show grid view"
              aria-pressed={viewMode === "grid"}
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
              type="button"
              aria-label="Show list view"
              aria-pressed={viewMode === "list"}
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
          {canUpload && <UploadButton onFilesSelected={handleFilesSelected} />}
        </div>
      </DashboardHeader>

      {/* Content */}
      <div className="relative flex-1 overflow-auto">
        {videosSortPending && (
          <div
            className="pointer-events-none sticky top-2 z-20 mr-3 ml-auto h-0 w-fit"
            role="status"
          >
            <span className="block bg-[#f0f0e8] px-2 py-1 text-xs font-bold text-[#888]">
              Sorting videos…
            </span>
          </div>
        )}
        {hasChildFolders && (
          <div
            className={cn(
              "p-6 transition-opacity duration-300",
              hasVideos ? "pb-0" : "",
              isLoadingData ? "opacity-0" : "opacity-100",
            )}
          >
            <h2 className="mb-3 text-xs font-black tracking-wider text-[#888] uppercase">
              Folders
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {sortedChildFolders.map((child) => (
                <ProjectCard
                  key={child._id}
                  teamSlug={resolvedTeamSlug}
                  project={child}
                  onOpen={() => navigate({ to: projectPath(resolvedTeamSlug, child._id) })}
                  onDelete={canUpload ? handleDeleteFolder : undefined}
                  onMove={canUpload ? (p) => setMoveTarget(p) : undefined}
                  dnd={
                    teamId
                      ? {
                          teamId,
                          currentParentId: resolvedProjectId,
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
          <div className="animate-in fade-in flex h-full items-center justify-center p-6 duration-300">
            <DropZone
              onFilesSelected={handleFilesSelected}
              disabled={!canUpload}
              className="w-full max-w-xl"
            />
          </div>
        ) : viewMode === "grid" ? (
          /* Grid View - Responsive tiles */
          <div
            className={cn(
              "p-6 transition-opacity duration-300",
              isLoadingData ? "opacity-0" : "opacity-100",
            )}
          >
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {videos?.map((video) => {
                const thumbnailSrc = video.thumbnailUrl?.startsWith("http")
                  ? video.thumbnailUrl
                  : undefined;
                const canDownload =
                  Boolean(video.s3Key) && video.status !== "failed" && video.status !== "uploading";
                const watchingCount = projectPresenceCounts?.counts?.[video._id] ?? 0;
                const isVersionStack = video.versionNumber > 1;

                return (
                  <VideoIntentTarget
                    key={video._id}
                    className="group flex cursor-pointer flex-col"
                    teamSlug={resolvedTeamSlug}
                    projectId={activeProjectId}
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
                        to: videoPath(resolvedTeamSlug, activeProjectId, video._id),
                      })
                    }
                  >
                    <div
                      className={cn(
                        "relative aspect-video overflow-hidden border-2 border-[#1a1a1a] bg-[#e8e8e0] transition-all group-hover:translate-x-[2px] group-hover:translate-y-[2px]",
                        isVersionStack
                          ? "shadow-[3px_3px_0px_0px_#c8c8c0,6px_6px_0px_0px_var(--shadow-color)] group-hover:shadow-[2px_2px_0px_0px_#c8c8c0,4px_4px_0px_0px_var(--shadow-color)]"
                          : "shadow-[4px_4px_0px_0px_var(--shadow-color)] group-hover:shadow-[2px_2px_0px_0px_var(--shadow-color)]",
                      )}
                    >
                      {thumbnailSrc ? (
                        <img
                          src={thumbnailSrc}
                          alt={video.title}
                          draggable={false}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Play className="h-10 w-10 text-[#888]" />
                        </div>
                      )}
                      {video.status === "ready" && video.duration && (
                        <div className="absolute right-2 bottom-2 bg-black/70 px-1.5 py-0.5 font-mono text-[11px] text-white">
                          {formatDuration(video.duration)}
                        </div>
                      )}
                      {isVersionStack && (
                        <Badge
                          variant="default"
                          className="absolute top-2 left-2 z-10 px-1.5 py-0 text-[10px] text-[#f0f0e8]"
                        >
                          Version {video.versionNumber}
                        </Badge>
                      )}
                      {video.status !== "ready" && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                          <span className="text-xs font-bold tracking-wider text-white uppercase">
                            {video.status === "uploading" && "Uploading..."}
                            {video.status === "processing" && "Processing..."}
                            {video.status === "failed" && "Failed"}
                          </span>
                        </div>
                      )}
                      {/* Hover menu */}
                      <div className="absolute top-2 right-2 opacity-100 transition-opacity md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              className="inline-flex h-8 w-8 cursor-pointer items-center justify-center bg-black/60 text-white hover:bg-black/80"
                              aria-label={`Open actions for ${video.title}`}
                            >
                              <MoreVertical className="h-4 w-4" aria-hidden="true" />
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
                              disabled={sharePending}
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
                                    projectId: activeProjectId,
                                    versionNumber: video.versionNumber,
                                  });
                                }}
                              >
                                <FolderInput className="mr-2 h-4 w-4" />
                                Move all versions
                              </DropdownMenuItem>
                            )}
                            {canDeleteVideo && (
                              <DropdownMenuItem
                                className="text-[#dc2626] focus:text-[#dc2626]"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteVideo(video._id, video.versionNumber);
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete latest version (v{video.versionNumber})
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <div className="mt-2.5">
                      <ExpandableTitle
                        title={video.title}
                        className="text-[15px] leading-tight font-black text-[#1a1a1a]"
                      />
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
                            {video.commentCountIsCapped ? "+" : ""}
                          </span>
                        )}
                        {watchingCount > 0 && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-[#1a1a1a]">
                            <Eye className="h-3 w-3" />
                            {watchingCount}
                          </span>
                        )}
                        <span className="ml-auto font-mono text-[11px] text-[#888]">
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
          <div
            className={cn(
              "divide-y-2 divide-[#1a1a1a] transition-opacity duration-300",
              isLoadingData ? "opacity-0" : "opacity-100",
            )}
          >
            {videos?.map((video) => {
              const thumbnailSrc = video.thumbnailUrl?.startsWith("http")
                ? video.thumbnailUrl
                : undefined;
              const canDownload =
                Boolean(video.s3Key) && video.status !== "failed" && video.status !== "uploading";
              const watchingCount = projectPresenceCounts?.counts?.[video._id] ?? 0;
              const isVersionStack = video.versionNumber > 1;

              return (
                <VideoIntentTarget
                  key={video._id}
                  className="group flex cursor-pointer items-center gap-5 px-6 py-3 transition-colors hover:bg-[#e8e8e0]"
                  teamSlug={resolvedTeamSlug}
                  projectId={activeProjectId}
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
                      to: videoPath(resolvedTeamSlug, activeProjectId, video._id),
                    })
                  }
                >
                  {/* Thumbnail */}
                  <div
                    className={cn(
                      "relative aspect-video w-44 shrink-0 overflow-hidden border-2 border-[#1a1a1a] bg-[#e8e8e0] transition-all group-hover:translate-x-[2px] group-hover:translate-y-[2px]",
                      isVersionStack
                        ? "shadow-[3px_3px_0px_0px_#c8c8c0,6px_6px_0px_0px_var(--shadow-color)] group-hover:shadow-[2px_2px_0px_0px_#c8c8c0,4px_4px_0px_0px_var(--shadow-color)]"
                        : "shadow-[4px_4px_0px_0px_var(--shadow-color)] group-hover:shadow-[2px_2px_0px_0px_var(--shadow-color)]",
                    )}
                  >
                    {thumbnailSrc ? (
                      <img
                        src={thumbnailSrc}
                        alt={video.title}
                        draggable={false}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Play className="h-6 w-6 text-[#888]" />
                      </div>
                    )}
                    {video.status !== "ready" && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                        <span className="text-[10px] font-bold tracking-wider text-white uppercase">
                          {video.status === "uploading" && "Uploading..."}
                          {video.status === "processing" && "Processing..."}
                          {video.status === "failed" && "Failed"}
                        </span>
                      </div>
                    )}
                    {video.status === "ready" && video.duration && (
                      <div className="absolute right-1 bottom-1 bg-black/70 px-1 py-0.5 font-mono text-[10px] text-white">
                        {formatDuration(video.duration)}
                      </div>
                    )}
                    {isVersionStack && (
                      <Badge
                        variant="default"
                        className="absolute top-1 left-1 z-10 px-1 py-0 text-[9px] text-[#f0f0e8]"
                      >
                        Version {video.versionNumber}
                      </Badge>
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <ExpandableTitle title={video.title} className="font-black text-[#1a1a1a]" />
                    <div className="mt-1 flex items-center gap-3">
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
                          {video.commentCountIsCapped ? "+" : ""}
                        </span>
                      )}
                      {watchingCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs text-[#1a1a1a]">
                          <Eye className="h-3.5 w-3.5" />
                          {watchingCount}
                        </span>
                      )}
                      <span className="font-mono text-xs text-[#888]">
                        {formatRelativeTime(video._creationTime)}
                      </span>
                      {video.uploaderName && (
                        <span className="text-xs text-[#888]">{video.uploaderName}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="opacity-100 transition-opacity md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center text-[#888] hover:text-[#1a1a1a]"
                          aria-label={`Open actions for ${video.title}`}
                        >
                          <MoreVertical className="h-4 w-4" aria-hidden="true" />
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
                          disabled={sharePending}
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
                                projectId: activeProjectId,
                                versionNumber: video.versionNumber,
                              });
                            }}
                          >
                            <FolderInput className="mr-2 h-4 w-4" />
                            Move all versions
                          </DropdownMenuItem>
                        )}
                        {canDeleteVideo && (
                          <DropdownMenuItem
                            className="text-[#dc2626] focus:text-[#dc2626]"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteVideo(video._id, video.versionNumber);
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete latest version (v{video.versionNumber})
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
        {(videosStatus === "CanLoadMore" || videosStatus === "LoadingMore") && (
          <div className="flex justify-center px-6 pb-6">
            <Button
              variant="primary"
              disabled={videosStatus === "LoadingMore"}
              onClick={loadMoreVideos}
            >
              {videosStatus === "LoadingMore" ? "Loading..." : "Load more videos"}
            </Button>
          </div>
        )}
      </div>

      {shareToast ? (
        <div className="fixed top-4 right-4 z-50 w-[min(28rem,calc(100vw-2rem))]">
          <div
            role={shareToast.tone === "error" ? "alert" : "status"}
            aria-live={shareToast.tone === "error" ? "assertive" : "polite"}
            className={cn(
              "border-2 px-3 py-2 text-sm font-bold shadow-[4px_4px_0px_0px_var(--shadow-color)]",
              shareToast.tone === "success"
                ? "border-[#1a1a1a] bg-[#f0f0e8] text-[#1a1a1a]"
                : "border-[#dc2626] bg-[#fef2f2] text-[#dc2626]",
            )}
          >
            <p>{shareToast.message}</p>
            {shareToast.url ? (
              <div className="mt-2 space-y-2">
                <Input
                  aria-label="Link to copy manually"
                  className="bg-white font-mono text-xs font-normal"
                  readOnly
                  value={shareToast.url}
                  onFocus={(event) => event.currentTarget.select()}
                  onClick={(event) => event.currentTarget.select()}
                />
                <Button size="sm" variant="outline" onClick={() => setShareToast(null)}>
                  Dismiss
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {dndError ? (
        <div className="fixed top-16 right-4 z-50" aria-live="polite">
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
                Create a folder inside {project?.name ?? "this folder"} to organize videos and
                sub-folders.
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
              <Button type="button" variant="outline" onClick={() => setCreateFolderOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!newFolderName.trim() || isCreatingFolder}>
                {isCreatingFolder ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {canUpload && project ? (
        <FolderShareDialog
          projectId={activeProjectId}
          folderName={project.name}
          open={folderShareProjectId === activeProjectId}
          onOpenChange={(open) => setFolderShareProjectId(open ? activeProjectId : null)}
        />
      ) : null}

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
