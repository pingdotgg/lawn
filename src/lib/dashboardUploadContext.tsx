import { createContext, useContext, type ReactNode } from "react";
import type { Id } from "@convex/_generated/dataModel";
import type { UploadStatus } from "@/components/upload/UploadProgress";

export type DashboardUploadContextValue = {
  requestUpload: (files: File[], preferredProjectId?: Id<"projects">) => void;
  requestVersionUpload: (
    sourceVideoId: Id<"videos">,
    versionStackId: Id<"videos">,
    projectId: Id<"projects">,
    file: File,
  ) => void;
  uploads: {
    id: string;
    kind?: "video" | "asset";
    projectId: Id<"projects">;
    creationIntent:
      | {
          kind: "standalone";
          projectId: Id<"projects">;
        }
      | {
          kind: "version";
          sourceVideoId: Id<"videos">;
          versionStackId: Id<"videos">;
        };
    file: File;
    videoId?: Id<"videos">;
    assetId?: Id<"projectAssets">;
    progress: number;
    status: UploadStatus;
    error?: string;
    bytesPerSecond?: number;
    estimatedSecondsRemaining?: number | null;
  }[];
  cancelUpload: (uploadId: string) => void;
  retryProcessing: (uploadId: string) => void;
};

const DashboardUploadContext = createContext<DashboardUploadContextValue | null>(null);

export function DashboardUploadProvider({
  value,
  children,
}: {
  value: DashboardUploadContextValue;
  children: ReactNode;
}) {
  return (
    <DashboardUploadContext.Provider value={value}>{children}</DashboardUploadContext.Provider>
  );
}

export function useDashboardUploadContext() {
  const value = useContext(DashboardUploadContext);
  if (!value) {
    throw new Error("useDashboardUploadContext must be used within DashboardUploadProvider");
  }
  return value;
}
