import { useAuth } from "@clerk/tanstack-react-start";
import { useConvex, useConvexAuth, useQuery } from "convex/react";
import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

import { Outlet, useLocation, useNavigate, useParams } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UploadProgress } from "@/components/upload/UploadProgress";
import { useVideoUploadManager, type ManagedUploadItem } from "./-useVideoUploadManager";
import { DashboardUploadProvider } from "@/lib/dashboardUploadContext";
import { videoPath, watchPath } from "@/lib/routes";
import { prewarmVideo } from "./-video.data";
import { resolveDashboardAccess } from "@/lib/dashboardAccess";

const VIDEO_FILE_EXTENSIONS = /\.(mp4|mov|m4v|webm|avi|mkv)$/i;

function isVideoFile(file: File) {
  return file.type.startsWith("video/") || VIDEO_FILE_EXTENSIONS.test(file.name);
}

function dragEventHasFiles(event: DragEvent) {
  return Array.from(event.dataTransfer?.types ?? []).includes("Files");
}

const DashboardUploadProgressItem = memo(function DashboardUploadProgressItem({
  upload,
  cancelUpload,
  retryProcessing,
  viewUploadedVersion,
}: {
  upload: ManagedUploadItem;
  cancelUpload: (uploadId: string) => void;
  retryProcessing: (uploadId: string) => void;
  viewUploadedVersion: (teamSlug: string, projectId: Id<"projects">, videoId: Id<"videos">) => void;
}) {
  const completedVersionId =
    upload.status === "complete" && upload.creationIntent.kind === "version"
      ? upload.videoId
      : undefined;
  const completedVersionTeamSlug = completedVersionId ? upload.teamSlug : undefined;

  return (
    <UploadProgress
      fileName={upload.file.name}
      fileSize={upload.file.size}
      progress={upload.progress}
      status={upload.status}
      error={upload.error}
      bytesPerSecond={upload.bytesPerSecond}
      estimatedSecondsRemaining={upload.estimatedSecondsRemaining}
      resuming={upload.resuming}
      intentLabel={upload.creationIntent.kind === "version" ? "New version" : undefined}
      onCancel={() => cancelUpload(upload.id)}
      onRetryProcessing={upload.canRetryProcessing ? () => retryProcessing(upload.id) : undefined}
      onView={
        completedVersionId && completedVersionTeamSlug
          ? () =>
              viewUploadedVersion(completedVersionTeamSlug, upload.projectId, completedVersionId)
          : undefined
      }
    />
  );
});

function DashboardUploadBoundary({
  teamSlug,
  routeProjectId,
  routeVideoId,
  uploadsEnabled,
  canUploadToCurrentProject,
  currentProjectIsViewer,
  children,
}: {
  teamSlug?: string;
  routeProjectId?: Id<"projects">;
  routeVideoId?: Id<"videos">;
  uploadsEnabled: boolean;
  canUploadToCurrentProject: boolean;
  currentProjectIsViewer: boolean;
  children: ReactNode;
}) {
  const convex = useConvex();
  const navigate = useNavigate({});
  const detailVideo = useQuery(
    api.videos.get,
    uploadsEnabled && routeVideoId ? { videoId: routeVideoId } : "skip",
  );
  const [isGlobalDragActive, setIsGlobalDragActive] = useState(false);
  const [projectPickerOpen, setProjectPickerOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[] | null>(null);
  const dragDepthRef = useRef(0);
  const shouldLoadUploadTargets =
    uploadsEnabled &&
    (projectPickerOpen ||
      pendingFiles !== null ||
      (isGlobalDragActive && !routeProjectId && !routeVideoId));
  const uploadTargets = useQuery(
    api.projects.listUploadTargets,
    shouldLoadUploadTargets ? (teamSlug ? { teamSlug } : {}) : "skip",
  );
  const { uploads, uploadFilesToProject, uploadNewVersion, cancelUpload, retryProcessing } =
    useVideoUploadManager();

  const requestUpload = useCallback(
    (inputFiles: File[], preferredProjectId?: Id<"projects">) => {
      if (!uploadsEnabled) return;
      const files = inputFiles.filter(isVideoFile);
      if (files.length === 0) return;

      if (preferredProjectId) {
        if (preferredProjectId === routeProjectId && currentProjectIsViewer) {
          window.alert("You need member access to upload to this project.");
          return;
        }
        void uploadFilesToProject(preferredProjectId, files, teamSlug);
        return;
      }

      if (routeProjectId && canUploadToCurrentProject) {
        void uploadFilesToProject(routeProjectId, files, teamSlug);
        return;
      }

      if (routeProjectId && currentProjectIsViewer) {
        window.alert("You need member access to upload to this project.");
        return;
      }

      if (uploadTargets && uploadTargets.length === 0) {
        window.alert("You do not have upload access to any projects.");
        return;
      }

      setPendingFiles(files);
      setProjectPickerOpen(true);
    },
    [
      canUploadToCurrentProject,
      currentProjectIsViewer,
      routeProjectId,
      teamSlug,
      uploadFilesToProject,
      uploadTargets,
      uploadsEnabled,
    ],
  );

  const handleProjectSelected = useCallback(
    (projectId: Id<"projects">) => {
      const files = pendingFiles;
      if (!files || files.length === 0) return;
      const selectedTarget = uploadTargets?.find((target) => target.projectId === projectId);

      setProjectPickerOpen(false);
      setPendingFiles(null);
      void uploadFilesToProject(projectId, files, selectedTarget?.teamSlug);
    },
    [pendingFiles, uploadFilesToProject, uploadTargets],
  );

  const requestVersionUpload = useCallback(
    (
      sourceVideoId: Id<"videos">,
      versionStackId: Id<"videos">,
      projectId: Id<"projects">,
      file: File,
    ) => {
      if (!uploadsEnabled) return;
      if (!isVideoFile(file)) return;
      void uploadNewVersion(sourceVideoId, versionStackId, projectId, file, teamSlug);
    },
    [teamSlug, uploadNewVersion, uploadsEnabled],
  );

  const handleProjectPickerOpenChange = useCallback((open: boolean) => {
    setProjectPickerOpen(open);
    if (!open) {
      setPendingFiles(null);
    }
  }, []);

  useEffect(() => {
    if (!uploadsEnabled) {
      dragDepthRef.current = 0;
      setIsGlobalDragActive(false);
      setProjectPickerOpen(false);
      setPendingFiles(null);
      return;
    }

    const handleDragEnter = (event: DragEvent) => {
      if (!dragEventHasFiles(event)) return;
      event.preventDefault();
      dragDepthRef.current += 1;
      setIsGlobalDragActive(true);
    };

    const handleDragOver = (event: DragEvent) => {
      if (!dragEventHasFiles(event)) return;
      event.preventDefault();
      setIsGlobalDragActive(true);
    };

    const handleDragLeave = (event: DragEvent) => {
      if (!dragEventHasFiles(event)) return;
      event.preventDefault();
      dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
      if (dragDepthRef.current === 0) {
        setIsGlobalDragActive(false);
      }
    };

    const handleDrop = (event: DragEvent) => {
      if (!dragEventHasFiles(event)) return;
      event.preventDefault();
      dragDepthRef.current = 0;
      setIsGlobalDragActive(false);

      const droppedFiles = Array.from(event.dataTransfer?.files ?? []);

      if (routeVideoId) {
        if (droppedFiles.length !== 1) {
          window.alert("Drop one video at a time to upload a new version.");
          return;
        }
        const file = droppedFiles[0];
        if (!isVideoFile(file)) {
          window.alert("Choose a single video file to upload as a new version.");
          return;
        }
        if (!detailVideo) {
          window.alert("Use the New version action when this video is ready for uploads.");
          return;
        }
        if (detailVideo.role === "viewer") {
          window.alert("You need member access to upload a new version.");
          return;
        }
        requestVersionUpload(
          detailVideo._id,
          detailVideo.versionStackId ?? detailVideo._id,
          detailVideo.projectId,
          file,
        );
        return;
      }

      const files = droppedFiles.filter(isVideoFile);
      if (files.length === 0) return;
      requestUpload(files);
    };

    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("drop", handleDrop);

    return () => {
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("drop", handleDrop);
    };
  }, [detailVideo, requestUpload, requestVersionUpload, routeVideoId, uploadsEnabled]);

  const viewUploadedVersion = useCallback(
    (uploadTeamSlug: string, projectId: Id<"projects">, videoId: Id<"videos">) => {
      prewarmVideo(convex, { teamSlug: uploadTeamSlug, projectId, videoId });
      navigate({ to: videoPath(uploadTeamSlug, projectId, videoId) });
    },
    [convex, navigate],
  );

  const uploadCommands = useMemo(
    () => ({
      requestUpload,
      requestVersionUpload,
    }),
    [requestUpload, requestVersionUpload],
  );

  return (
    <>
      <main className="flex flex-1 flex-col overflow-auto">
        <DashboardUploadProvider value={uploadCommands}>{children}</DashboardUploadProvider>
      </main>

      {isGlobalDragActive && (
        <div className="pointer-events-none fixed inset-0 z-40">
          <div className="absolute inset-0 bg-[#1a1a1a]/20" />
          <div className="absolute inset-4 flex items-center justify-center border-4 border-dashed border-[#2d5a2d] bg-[#2d5a2d]/10">
            <p className="border-2 border-[#1a1a1a] bg-[#f0f0e8] px-4 py-2 text-sm font-bold text-[#1a1a1a]">
              {routeVideoId
                ? detailVideo?.role === "viewer"
                  ? "New version uploads require member access"
                  : "Drop one video to upload it as a new version"
                : "Drop videos to upload"}
            </p>
          </div>
        </div>
      )}

      {uploads.length > 0 && (
        <div className="fixed top-16 right-4 left-4 z-50 max-h-[calc(100dvh-5rem)] space-y-2 overflow-y-auto overscroll-contain sm:top-auto sm:right-auto sm:bottom-4 sm:max-h-[calc(100dvh-2rem)] sm:w-full sm:max-w-sm">
          {uploads.map((upload) => (
            <DashboardUploadProgressItem
              key={upload.id}
              upload={upload}
              cancelUpload={cancelUpload}
              retryProcessing={retryProcessing}
              viewUploadedVersion={viewUploadedVersion}
            />
          ))}
        </div>
      )}

      <Dialog open={projectPickerOpen} onOpenChange={handleProjectPickerOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Choose a project</DialogTitle>
            <DialogDescription>
              {pendingFiles?.length
                ? `Upload ${pendingFiles.length} video${pendingFiles.length > 1 ? "s" : ""} to:`
                : "Pick a project to start uploading."}
            </DialogDescription>
          </DialogHeader>
          {uploadTargets === undefined ? (
            <p className="text-sm text-[#888]">Loading projects...</p>
          ) : uploadTargets.length === 0 ? (
            <p className="text-sm text-[#888]">No uploadable projects found for your account.</p>
          ) : (
            <div className="max-h-80 divide-y-2 divide-[#1a1a1a] overflow-y-auto border-2 border-[#1a1a1a]">
              {uploadTargets.map((target) => (
                <button
                  key={target.projectId}
                  type="button"
                  className="w-full px-4 py-3 text-left transition-colors hover:bg-[#e8e8e0]"
                  onClick={() => handleProjectSelected(target.projectId)}
                >
                  <p className="truncate font-bold text-[#1a1a1a]" title={target.projectPath}>
                    {target.projectPath}
                  </p>
                  <p className="text-xs text-[#888]">{target.teamName}</p>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function DashboardLayout() {
  const { isLoaded, userId } = useAuth();
  const { isLoading: isConvexAuthLoading, isAuthenticated: isConvexAuthenticated } =
    useConvexAuth();
  const location = useLocation();
  const { pathname, searchStr } = location;
  const params = useParams({ strict: false });
  const teamSlug = typeof params.teamSlug === "string" ? params.teamSlug : undefined;
  const rawProjectId = typeof params.projectId === "string" ? params.projectId : undefined;
  const rawVideoId = typeof params.videoId === "string" ? params.videoId : undefined;
  const publicPlaybackId = useQuery(
    api.videos.getPublicIdByVideoId,
    rawVideoId ? { videoId: rawVideoId } : "skip",
  );
  const contextRequired = Boolean(teamSlug || rawProjectId || rawVideoId);
  const workspaceContext = useQuery(
    api.workspace.resolveContext,
    isLoaded && Boolean(userId) && !isConvexAuthLoading && isConvexAuthenticated && contextRequired
      ? { teamSlug, projectId: rawProjectId, videoId: rawVideoId }
      : "skip",
  );
  const access = resolveDashboardAccess({
    clerkLoaded: isLoaded,
    hasClerkUser: Boolean(userId),
    convexAuthLoading: isConvexAuthLoading,
    convexAuthenticated: isConvexAuthenticated,
    contextRequired,
    workspaceContext,
    publicLookupRequired: Boolean(rawVideoId),
    publicId: publicPlaybackId,
  });
  const routeProjectId = access.kind === "dashboard" ? workspaceContext?.project?._id : undefined;
  const routeVideoId = access.kind === "dashboard" ? workspaceContext?.video?._id : undefined;
  const resolvedTeamSlug = access.kind === "dashboard" ? workspaceContext?.team.slug : undefined;
  const currentTeamRole = access.kind === "dashboard" ? workspaceContext?.team.role : undefined;
  const canUploadToCurrentProject = Boolean(
    routeProjectId && currentTeamRole && currentTeamRole !== "viewer",
  );
  const currentProjectIsViewer = currentTeamRole === "viewer";

  const publicRedirectId = access.kind === "redirect-public" ? access.publicId : undefined;
  const shouldRedirectToSignIn = access.kind === "redirect-sign-in";

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (publicRedirectId) {
      window.location.replace(watchPath(publicRedirectId));
      return;
    }

    if (shouldRedirectToSignIn) {
      const redirectUrl = `${pathname}${searchStr}`;
      window.location.replace(`/sign-in?redirect_url=${encodeURIComponent(redirectUrl)}`);
    }
  }, [pathname, publicRedirectId, searchStr, shouldRedirectToSignIn]);

  let dashboardContent: ReactNode;
  if (access.kind === "loading") {
    dashboardContent = (
      <div className="flex h-full items-center justify-center bg-[#f0f0e8]">
        <div role="status" aria-live="polite" className="text-[#888]">
          Checking access...
        </div>
      </div>
    );
  } else if (access.kind === "redirect-public" || access.kind === "redirect-sign-in") {
    dashboardContent = (
      <div className="flex h-full items-center justify-center bg-[#f0f0e8]">
        <div role="status" aria-live="polite" className="text-[#888]">
          Redirecting...
        </div>
      </div>
    );
  } else if (access.kind === "auth-unavailable") {
    dashboardContent = (
      <div className="flex h-full items-center justify-center bg-[#f0f0e8] p-6">
        <div
          role="alert"
          className="max-w-md border-2 border-[#1a1a1a] bg-[#f0f0e8] p-5 text-center shadow-[4px_4px_0px_0px_var(--shadow-color)]"
        >
          <p className="font-bold text-[#1a1a1a]">We couldn't verify your dashboard session.</p>
          <p className="mt-1 text-sm text-[#888]">Try again, or return home and sign in again.</p>
          <div className="mt-4 flex justify-center gap-2">
            <button
              type="button"
              className="border-2 border-[#1a1a1a] bg-[#1a1a1a] px-3 py-2 text-sm font-bold text-[#f0f0e8]"
              onClick={() => window.location.reload()}
            >
              Try again
            </button>
            <a
              href="/"
              className="border-2 border-[#1a1a1a] px-3 py-2 text-sm font-bold text-[#1a1a1a]"
            >
              Go home
            </a>
          </div>
        </div>
      </div>
    );
  } else if (access.kind === "not-found") {
    dashboardContent = (
      <div className="flex h-full items-center justify-center bg-[#f0f0e8] p-6">
        <div role="alert" className="text-center text-[#888]">
          <p>Video or workspace not found</p>
          <a className="mt-3 inline-block font-bold text-[#1a1a1a] underline" href="/dashboard">
            Back to dashboard
          </a>
        </div>
      </div>
    );
  } else {
    dashboardContent = <Outlet />;
  }

  return (
    <div className={cn("relative flex h-full flex-col bg-[#f0f0e8]")}>
      <DashboardUploadBoundary
        teamSlug={resolvedTeamSlug}
        routeProjectId={routeProjectId}
        routeVideoId={routeVideoId}
        uploadsEnabled={access.kind === "dashboard"}
        canUploadToCurrentProject={canUploadToCurrentProject}
        currentProjectIsViewer={currentProjectIsViewer}
      >
        {dashboardContent}
      </DashboardUploadBoundary>
    </div>
  );
}
