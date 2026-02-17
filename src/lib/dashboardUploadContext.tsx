import { createContext, useContext, type ReactNode } from "react";
import type { Id } from "@convex/_generated/dataModel";
import type { UploadStatus } from "@/components/upload/UploadProgress";

export type DashboardUploadContextValue = {
  requestUpload: (files: File[], preferredProjectId?: Id<"projects">) => void;
  uploads: {
    id: string;
    projectId: Id<"projects">;
    file: File;
    progress: number;
    status: UploadStatus;
    error?: string;
    bytesPerSecond?: number;
    estimatedSecondsRemaining?: number | null;
  }[];
  cancelUpload: (uploadId: string) => void;
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
    <DashboardUploadContext.Provider value={value}>
      {children}
    </DashboardUploadContext.Provider>
  );
}

export function useDashboardUploadContext() {
  const value = useContext(DashboardUploadContext);
  if (!value) {
    throw new Error("useDashboardUploadContext must be used within DashboardUploadProvider");
  }
  return value;
}
