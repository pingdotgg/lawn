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
    <div className="border border-zinc-800 rounded-lg p-4 bg-zinc-900/50">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-zinc-200 truncate text-sm">{fileName}</p>
          <p className="text-xs text-zinc-500 mt-0.5">{formatBytes(fileSize)}</p>
        </div>
        <div className="flex items-center gap-2">
          {status === "complete" && (
            <CheckCircle className="h-5 w-5 text-emerald-500" />
          )}
          {status === "error" && (
            <AlertCircle className="h-5 w-5 text-red-500" />
          )}
          {status === "processing" && (
            <Loader2 className="h-5 w-5 text-amber-500 animate-spin" />
          )}
          {(status === "pending" || status === "uploading") && onCancel && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onCancel}
              className="h-7 w-7 text-zinc-500 hover:text-zinc-300"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {status === "uploading" && (
        <div className="mt-3 space-y-1.5">
          <Progress value={progress} />
          <div className="flex justify-between text-xs text-zinc-500 font-mono">
            <span>{formatSpeed(bytesPerSecond)}</span>
            <span>
              {progress}%
              {estimatedSecondsRemaining !== null && estimatedSecondsRemaining > 0 && (
                <span className="text-zinc-600"> · {formatTimeRemaining(estimatedSecondsRemaining)} left</span>
              )}
            </span>
          </div>
        </div>
      )}

      {status === "processing" && (
        <p className="text-xs text-zinc-500 mt-2">Processing video...</p>
      )}

      {status === "error" && error && (
        <p className="text-xs text-red-400 mt-2">{error}</p>
      )}
    </div>
  );
}
