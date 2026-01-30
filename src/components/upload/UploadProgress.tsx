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
  if (seconds < 60) return `${seconds}s remaining`;
  if (seconds < 3600) return `${Math.ceil(seconds / 60)}m remaining`;
  return `${Math.ceil(seconds / 3600)}h remaining`;
}

interface UploadProgressProps {
  fileName: string;
  fileSize: number;
  progress: number;
  status: UploadStatus;
  error?: string;
  bytesPerSecond?: number;
  estimatedSecondsRemaining?: number | null;
  onCancel?: () => void;
}

export function UploadProgress({
  fileName,
  fileSize,
  progress,
  status,
  error,
  bytesPerSecond = 0,
  estimatedSecondsRemaining = null,
  onCancel,
}: UploadProgressProps) {
  return (
    <div className="border rounded-lg p-4 space-y-2">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{fileName}</p>
          <p className="text-sm text-neutral-500">{formatBytes(fileSize)}</p>
        </div>
        <div className="flex items-center gap-2 ml-4">
          {status === "complete" && (
            <CheckCircle className="h-5 w-5 text-green-500" />
          )}
          {status === "error" && (
            <AlertCircle className="h-5 w-5 text-red-500" />
          )}
          {status === "processing" && (
            <Loader2 className="h-5 w-5 text-neutral-500 animate-spin" />
          )}
          {(status === "pending" || status === "uploading") && onCancel && (
            <Button variant="ghost" size="icon" onClick={onCancel}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {status === "uploading" && (
        <div className="space-y-1">
          <Progress value={progress} />
          <div className="flex justify-between text-xs text-neutral-500">
            <span>{formatSpeed(bytesPerSecond)}</span>
            <span>
              {progress}%
              {estimatedSecondsRemaining !== null && estimatedSecondsRemaining > 0 && (
                <> · {formatTimeRemaining(estimatedSecondsRemaining)}</>
              )}
            </span>
          </div>
        </div>
      )}

      {status === "processing" && (
        <p className="text-sm text-neutral-500">Processing video...</p>
      )}

      {status === "error" && error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}
