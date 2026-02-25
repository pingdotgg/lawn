
import { useAuth } from "@clerk/tanstack-react-start";
import { useConvex, useQuery } from "convex/react";
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

import {
  Outlet,
  Link,
  useLocation,
  useParams,
} from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import {
  dashboardHomePath,
  teamHomePath,
  teamSettingsPath,
} from "@/lib/routes";
import { useRoutePrewarmIntent } from "@/lib/useRoutePrewarmIntent";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UploadProgress } from "@/components/upload/UploadProgress";
import { prewarmDashboardIndex } from "./-index.data";
import { prewarmSettings } from "./-settings.data";
import { prewarmTeam } from "./-team.data";
import { useVideoUploadManager } from "./-useVideoUploadManager";
import { DashboardUploadProvider } from "@/lib/dashboardUploadContext";

const VIDEO_FILE_EXTENSIONS = /\.(mp4|mov|m4v|webm|avi|mkv)$/i;

function isVideoFile(file: File) {
  return file.type.startsWith("video/") || VIDEO_FILE_EXTENSIONS.test(file.name);
}

function getVideoFiles(files: FileList | null) {
  if (!files) return [];
  return Array.from(files).filter(isVideoFile);
}

function dragEventHasFiles(event: DragEvent) {
  return Array.from(event.dataTransfer?.types ?? []).includes("Files");
}

export default function DashboardLayout() {
  const { isLoaded, userId } = useAuth();
  const location = useLocation();
  const { pathname, searchStr } = location;
  const params = useParams({ strict: false });
  const convex = useConvex();
  const teamSlug =
    typeof params.teamSlug === "string" ? params.teamSlug : undefined;
  const routeProjectId =
    typeof params.projectId === "string"
      ? (params.projectId as Id<"projects">)
      : undefined;
  const routeVideoId =
    typeof params.videoId === "string" ? params.videoId : undefined;
  const publicPlaybackId = useQuery(
    api.videos.getPublicIdByVideoId,
    routeVideoId ? { videoId: routeVideoId } : "skip",
  );
  const teamHome = teamSlug ? teamHomePath(teamSlug) : null;
  const settingsPath = teamSlug ? teamSettingsPath(teamSlug) : null;
  const uploadTargets = useQuery(
    api.projects.listUploadTargets,
    teamSlug ? { teamSlug } : {},
  );
  const {
    uploads,
    uploadFilesToProject,
    cancelUpload,
  } = useVideoUploadManager();
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

      if (
        routeProjectId &&
        (canUploadToCurrentProject || uploadTargets === undefined)
      ) {
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
    [
      canUploadToCurrentProject,
      routeProjectId,
      uploadFilesToProject,
      uploadTargets,
    ],
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

      const files = getVideoFiles(event.dataTransfer?.files ?? null);
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
  }, [requestUpload]);

  const uploadContext = useMemo(
    () => ({
      requestUpload,
      uploads,
      cancelUpload,
    }),
    [requestUpload, uploads, cancelUpload],
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
      <div className="h-full flex items-center justify-center bg-[#f0f0e8]">
        <div className="text-[#888]">Loading...</div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="h-full flex items-center justify-center bg-[#f0f0e8]">
        <div className="text-[#888]">
          {isResolvingPublicPlaybackExemption
            ? "Checking public playback access..."
            : "Redirecting to sign in..."}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative h-full flex flex-col bg-[#f0f0e8]")}>
      {/* Main content */}
      <main className="flex-1 overflow-auto flex flex-col">
        <DashboardUploadProvider value={uploadContext}>
          <Outlet />
        </DashboardUploadProvider>
      </main>

      {isGlobalDragActive && (
        <div className="pointer-events-none fixed inset-0 z-40">
          <div className="absolute inset-0 bg-[#1a1a1a]/20" />
          <div className="absolute inset-4 border-4 border-dashed border-[#2d5a2d] bg-[#2d5a2d]/10 flex items-center justify-center">
            <p className="border-2 border-[#1a1a1a] bg-[#f0f0e8] px-4 py-2 text-sm font-bold text-[#1a1a1a]">
              Drop videos to upload
            </p>
          </div>
        </div>
      )}

      {uploads.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 w-full max-w-sm space-y-2 px-4 sm:px-0">
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
              onCancel={() => cancelUpload(upload.id)}
            />
          ))}
        </div>
      )}

      <Dialog open={projectPickerOpen} onOpenChange={handleProjectPickerOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Choose a project</DialogTitle>
            <DialogDescription>
              {pendingFiles?.length ? `Upload ${pendingFiles.length} video${pendingFiles.length > 1 ? "s" : ""} to:` : "Pick a project to start uploading."}
            </DialogDescription>
          </DialogHeader>
          {uploadTargets === undefined ? (
            <p className="text-sm text-[#888]">Loading projects...</p>
          ) : uploadTargets.length === 0 ? (
            <p className="text-sm text-[#888]">
              No uploadable projects found for your account.
            </p>
          ) : (
            <div className="max-h-80 overflow-y-auto border-2 border-[#1a1a1a] divide-y-2 divide-[#1a1a1a]">
              {uploadTargets.map((target) => (
                <button
                  key={target.projectId}
                  type="button"
                  className="w-full px-4 py-3 text-left hover:bg-[#e8e8e0] transition-colors"
                  onClick={() => handleProjectSelected(target.projectId)}
                >
                  <p className="font-bold text-[#1a1a1a]">{target.projectName}</p>
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
