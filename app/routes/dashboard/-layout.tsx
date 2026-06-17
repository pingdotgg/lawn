import { useAuth } from "@clerk/tanstack-react-start";
import { useConvex, useQuery } from "convex/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { useVideoUploadManager } from "./-useVideoUploadManager";
import { DashboardUploadProvider } from "@/lib/dashboardUploadContext";
import { videoPath } from "@/lib/routes";
import { prewarmVideo } from "./-video.data";

const VIDEO_FILE_EXTENSIONS = /\.(mp4|mov|m4v|webm|avi|mkv)$/i;

function isVideoFile(file: File) {
  return file.type.startsWith("video/") || VIDEO_FILE_EXTENSIONS.test(file.name);
}

function dragEventHasFiles(event: DragEvent) {
  return Array.from(event.dataTransfer?.types ?? []).includes("Files");
}

export default function DashboardLayout() {
  const { isLoaded, userId } = useAuth();
  const convex = useConvex();
  const navigate = useNavigate({});
  const location = useLocation();
  const { pathname, searchStr } = location;
  const params = useParams({ strict: false });
  const teamSlug = typeof params.teamSlug === "string" ? params.teamSlug : undefined;
  const routeProjectId =
    typeof params.projectId === "string" ? (params.projectId as Id<"projects">) : undefined;
  const routeVideoId =
    typeof params.videoId === "string" ? (params.videoId as Id<"videos">) : undefined;
  const publicPlaybackId = useQuery(
    api.videos.getPublicIdByVideoId,
    routeVideoId ? { videoId: routeVideoId } : "skip",
  );
  const detailVideo = useQuery(
    api.videos.get,
    routeVideoId && userId ? { videoId: routeVideoId } : "skip",
  );
  const uploadTargets = useQuery(api.projects.listUploadTargets, teamSlug ? { teamSlug } : {});
  const { uploads, uploadFilesToProject, uploadNewVersion, cancelUpload, retryProcessing } =
    useVideoUploadManager();
  const [isGlobalDragActive, setIsGlobalDragActive] = useState(false);
  const [projectPickerOpen, setProjectPickerOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[] | null>(null);
  const dragDepthRef = useRef(0);
  const uploadableProjectIds = useMemo(
    () => new Set((uploadTargets ?? []).map((target) => target.projectId)),
    [uploadTargets],
  );
  const canUploadToCurrentProject = routeProjectId
    ? uploadableProjectIds.has(routeProjectId)
    : false;

  const requestUpload = useCallback(
    (inputFiles: File[], preferredProjectId?: Id<"projects">) => {
      const files = inputFiles.filter(isVideoFile);
      if (files.length === 0) return;

      if (preferredProjectId) {
        void uploadFilesToProject(preferredProjectId, files);
        return;
      }

      if (routeProjectId && (canUploadToCurrentProject || uploadTargets === undefined)) {
        void uploadFilesToProject(routeProjectId, files);
        return;
      }

      if (uploadTargets && uploadTargets.length === 0) {
        window.alert("You do not have upload access to any projects.");
        return;
      }

      setPendingFiles(files);
      setProjectPickerOpen(true);
    },
    [canUploadToCurrentProject, routeProjectId, uploadFilesToProject, uploadTargets],
  );

  const handleProjectSelected = useCallback(
    (projectId: Id<"projects">) => {
      const files = pendingFiles;
      if (!files || files.length === 0) return;

      setProjectPickerOpen(false);
      setPendingFiles(null);
      void uploadFilesToProject(projectId, files);
    },
    [pendingFiles, uploadFilesToProject],
  );

  const requestVersionUpload = useCallback(
    (
      sourceVideoId: Id<"videos">,
      versionStackId: Id<"videos">,
      projectId: Id<"projects">,
      file: File,
    ) => {
      if (!isVideoFile(file)) return;
      void uploadNewVersion(sourceVideoId, versionStackId, projectId, file);
    },
    [uploadNewVersion],
  );

  const handleProjectPickerOpenChange = useCallback((open: boolean) => {
    setProjectPickerOpen(open);
    if (!open) {
      setPendingFiles(null);
    }
  }, []);

  useEffect(() => {
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
  }, [detailVideo, requestUpload, requestVersionUpload, routeVideoId]);

  const viewUploadedVersion = useCallback(
    (projectId: Id<"projects">, videoId: Id<"videos">) => {
      if (!teamSlug) return;
      prewarmVideo(convex, { teamSlug, projectId, videoId });
      navigate({ to: videoPath(teamSlug, projectId, videoId) });
    },
    [convex, navigate, teamSlug],
  );

  const uploadContext = useMemo(
    () => ({
      requestUpload,
      requestVersionUpload,
      uploads,
      cancelUpload,
      retryProcessing,
    }),
    [requestUpload, requestVersionUpload, uploads, cancelUpload, retryProcessing],
  );
  const isResolvingPublicPlaybackExemption =
    Boolean(isLoaded && !userId && routeVideoId) && publicPlaybackId === undefined;

  useEffect(() => {
    if (!isLoaded || userId) return;
    if (typeof window === "undefined") return;

    if (routeVideoId) {
      if (publicPlaybackId === undefined) return;
      if (publicPlaybackId) {
        window.location.replace(`/watch/${publicPlaybackId}`);
        return;
      }
    }

    const redirectUrl = `${pathname}${searchStr}`;
    window.location.replace(`/sign-in?redirect_url=${encodeURIComponent(redirectUrl)}`);
  }, [isLoaded, userId, pathname, searchStr, routeVideoId, publicPlaybackId]);

  if (!isLoaded) {
    return (
      <div className="flex h-full items-center justify-center bg-[#f0f0e8]">
        <div className="text-[#888]">Loading...</div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="flex h-full items-center justify-center bg-[#f0f0e8]">
        <div className="text-[#888]">
          {isResolvingPublicPlaybackExemption
            ? "Checking public playback access..."
            : "Redirecting to sign in..."}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative flex h-full flex-col bg-[#f0f0e8]")}>
      {/* Main content */}
      <main className="flex flex-1 flex-col overflow-auto">
        <DashboardUploadProvider value={uploadContext}>
          <Outlet />
        </DashboardUploadProvider>
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
        <div className="fixed top-16 right-4 left-4 z-50 space-y-2 sm:top-auto sm:right-auto sm:bottom-4 sm:w-full sm:max-w-sm">
          {uploads.map((upload) => {
            const completedVersionId =
              upload.status === "complete" && upload.creationIntent.kind === "version"
                ? upload.videoId
                : undefined;

            return (
              <UploadProgress
                key={upload.id}
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
                onRetryProcessing={
                  upload.canRetryProcessing ? () => retryProcessing(upload.id) : undefined
                }
                onView={
                  completedVersionId && teamSlug
                    ? () => viewUploadedVersion(upload.projectId, completedVersionId)
                    : undefined
                }
              />
            );
          })}
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
    </div>
  );
}
