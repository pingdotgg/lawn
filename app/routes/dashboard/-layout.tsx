
import { UserButton, useAuth } from "@clerk/tanstack-react-start";
import { useConvex, useMutation, useQuery } from "convex/react";
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
import { Home, FolderOpen, Settings, Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme/ThemeToggle";
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

type DashboardNavItemProps = {
  name: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  disabled?: boolean;
  isActive: boolean;
  prewarm?: () => void | Promise<void>;
};

function DashboardNavItem({
  name,
  href,
  icon: Icon,
  disabled,
  isActive,
  prewarm,
}: DashboardNavItemProps) {
  const prewarmIntentHandlers = useRoutePrewarmIntent(() => prewarm?.());

  return (
    <Link
      to={href}
      preload="intent"
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : undefined}
      className={cn(
        "w-10 h-10 flex items-center justify-center transition-colors",
        disabled
          ? "text-[#c2c2b9] pointer-events-none"
          : isActive
          ? "bg-[#1a1a1a] text-[#f0f0e8]"
          : "text-[#888] hover:bg-[#e8e8e0] hover:text-[#1a1a1a]"
      )}
      title={name}
      {...prewarmIntentHandlers}
    >
      <Icon className="h-5 w-5" />
    </Link>
  );
}

function ThemeToggleButton() {
  const { theme, toggleTheme, mounted } = useTheme();

  if (!mounted) return <div className="w-8 h-8" />;

  return (
    <button
      onClick={toggleTheme}
      className="w-8 h-8 flex items-center justify-center text-[#888] hover:text-[#1a1a1a] hover:bg-[#e8e8e0] transition-colors"
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode (⌘⇧L)`}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </button>
  );
}

export default function DashboardLayout() {
  const { isLoaded, userId } = useAuth();
  const isAllowed = useQuery(api.userAllowed.check);
  const ensureUserAllowed = useMutation(api.userAllowed.ensure);
  const hasEnsuredRef = useRef(false);
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
  const isProjectPageRoute = !!routeProjectId && !routeVideoId;
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
  const prewarmHomeIntentHandlers = useRoutePrewarmIntent(() =>
    prewarmDashboardIndex(convex),
  );
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

  useEffect(() => {
    if (!userId || hasEnsuredRef.current) return;
    hasEnsuredRef.current = true;
    void ensureUserAllowed();
  }, [userId, ensureUserAllowed]);

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

  if (isAllowed === null) {
    return (
      <div className="h-full flex items-center justify-center bg-[#f0f0e8]">
        <div className="text-[#888]">Loading...</div>
      </div>
    );
  }

  if (!isAllowed) {
    return (
      <div className="h-full flex items-center justify-center bg-[#f0f0e8]">
        <div className="max-w-md w-full text-center px-6">
          <h1 className="text-4xl font-black text-[#1a1a1a] tracking-tight">
            You&apos;re on the list
          </h1>
          <p className="mt-4 text-[#888] text-sm leading-relaxed">
            Your account is pending approval. You&apos;ll get access once
            we&apos;ve reviewed your request.
          </p>
          <div className="mt-8 border-t-2 border-[#1a1a1a] pt-6">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-9 h-9 rounded-none mx-auto",
                  userButtonPopoverCard:
                    "bg-[#f0f0e8] border-2 border-[#1a1a1a] rounded-none shadow-none",
                  userButtonPopoverActionButton:
                    "text-[#1a1a1a] hover:bg-[#e8e8e0] rounded-none",
                  userButtonPopoverActionButtonText: "text-[#1a1a1a]",
                  userButtonPopoverFooter: "hidden",
                },
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  const navigation = [
    {
      name: "Home",
      href: dashboardHomePath(),
      icon: Home,
      prewarm: () => prewarmDashboardIndex(convex),
      isActive: pathname === dashboardHomePath(),
    },
    {
      name: "Projects",
      href: teamHome ?? dashboardHomePath(),
      icon: FolderOpen,
      disabled: !teamHome,
      prewarm: teamSlug
        ? () => prewarmTeam(convex, { teamSlug })
        : undefined,
      isActive:
        !!teamHome &&
        (pathname === teamHome ||
          (pathname.startsWith(`${teamHome}/`) &&
            pathname !== settingsPath &&
            !pathname.startsWith(`${settingsPath}/`))),
    },
    {
      name: "Settings",
      href: settingsPath ?? dashboardHomePath(),
      icon: Settings,
      disabled: !settingsPath,
      prewarm: teamSlug
        ? () => prewarmSettings(convex, { teamSlug })
        : undefined,
      isActive:
        !!settingsPath &&
        (pathname === settingsPath || pathname.startsWith(`${settingsPath}/`)),
    },
  ];

  return (
    <div className="relative h-full flex bg-[#f0f0e8]">
      {/* Sidebar */}
      <aside className="w-16 border-r-2 border-[#1a1a1a] bg-[#f0f0e8] flex flex-col items-center py-4">
        {/* Logo */}
        <Link
          to={dashboardHomePath()}
          preload="intent"
          className="mb-8"
          {...prewarmHomeIntentHandlers}
        >
          <span className="text-lg font-black">l</span>
        </Link>

        {/* Navigation */}
        <nav className="flex-1 flex flex-col items-center gap-2">
          {navigation.map((item) => {
            return (
              <DashboardNavItem
                key={item.name}
                name={item.name}
                href={item.href}
                icon={item.icon}
                disabled={item.disabled}
                isActive={item.isActive}
                prewarm={item.prewarm}
              />
            );
          })}
        </nav>

        {/* User & Theme */}
        <div className="mt-auto flex flex-col items-center gap-3">
          <ThemeToggleButton />
          <UserButton
            appearance={{
              elements: {
                avatarBox: "w-9 h-9 rounded-none",
                userButtonPopoverCard: "bg-[#f0f0e8] border-2 border-[#1a1a1a] rounded-none shadow-none",
                userButtonPopoverActionButton: "text-[#1a1a1a] hover:bg-[#e8e8e0] rounded-none",
                userButtonPopoverActionButtonText: "text-[#1a1a1a]",
                userButtonPopoverFooter: "hidden",
              },
            }}
          />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
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

      {!isProjectPageRoute && uploads.length > 0 && (
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
