"use client";

import { Progress } from "@/components/ui/progress";
import { formatBytes } from "@/lib/utils";
import { X, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export type UploadStatus = "pending" | "uploading" | "processing" | "complete" | "error";

function formatSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond === 0) return "—";
  return `${formatBytes(bytesPerSecond)}/s`;
}

function formatTimeRemaining(seconds: number | null): string {
  if (seconds === null || seconds <= 0) return "";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.ceil(seconds / 60)}m`;
  return `${Math.ceil(seconds / 3600)}h`;
}

interface UploadProgressProps {
  fileName: string;
  fileSize: number;
  progress: number;
  status: UploadStatus;
  error?: string;
  bytesPerSecond?: number;
  estimatedSecondsRemaining?: number | null;
  resuming?: boolean;
  intentLabel?: string;
  onCancel?: () => void;
  onRetryProcessing?: () => void;
  onView?: () => void;
}

export function UploadProgress({
  fileName,
  fileSize,
  progress,
  status,
  error,
  bytesPerSecond = 0,
  estimatedSecondsRemaining = null,
  resuming = false,
  intentLabel,
  onCancel,
  onRetryProcessing,
  onView,
}: UploadProgressProps) {
  return (
    <div
      className="border-2 border-[#1a1a1a] bg-[#f0f0e8] p-4"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {intentLabel && (
            <p className="mb-1 text-[10px] font-black tracking-wider text-[#2d5a2d] uppercase">
              {intentLabel}
            </p>
          )}
          <p className="truncate text-sm font-bold text-[#1a1a1a]">{fileName}</p>
          <p className="mt-0.5 text-xs text-[#888]">
            {formatBytes(fileSize)}
            {resuming ? " · Resuming" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {status === "complete" && <CheckCircle className="h-5 w-5 text-[#2d5a2d]" />}
          {status === "error" && <AlertCircle className="h-5 w-5 text-[#dc2626]" />}
          {status === "processing" && <Loader2 className="h-5 w-5 animate-spin text-[#2d5a2d]" />}
          {(status === "pending" || status === "uploading" || status === "error") && onCancel && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onCancel}
              className="h-7 w-7 text-[#888] hover:text-[#1a1a1a]"
              aria-label={
                status === "error" ? `Dismiss ${fileName}` : `Cancel upload of ${fileName}`
              }
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>

      {status === "uploading" && (
        <div className="mt-3 space-y-1.5">
          <Progress value={progress} />
          <div className="flex justify-between font-mono text-xs text-[#888]">
            <span>{formatSpeed(bytesPerSecond)}</span>
            <span>
              {progress}%
              {estimatedSecondsRemaining !== null && estimatedSecondsRemaining > 0 && (
                <span className="text-[#888]">
                  {" "}
                  · {formatTimeRemaining(estimatedSecondsRemaining)} left
                </span>
              )}
            </span>
          </div>
        </div>
      )}

      {status === "processing" && <p className="mt-2 text-xs text-[#888]">Processing video...</p>}

      {status === "complete" && (
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-xs font-bold text-[#2d5a2d]">
            {intentLabel ? "New version uploaded." : "Upload complete."}
          </p>
          {onView && (
            <Button variant="outline" size="sm" onClick={onView}>
              View version
            </Button>
          )}
        </div>
      )}

      {status === "error" && error && (
        <div className="mt-2 space-y-2">
          <p className="text-xs text-[#dc2626]">{error}</p>
          {onRetryProcessing && (
            <Button variant="primary" size="sm" onClick={onRetryProcessing}>
              Retry processing
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
