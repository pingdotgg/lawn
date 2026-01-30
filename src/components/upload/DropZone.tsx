"use client";

import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { Upload, Video } from "lucide-react";

interface DropZoneProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
  className?: string;
}

export function DropZone({ onFilesSelected, disabled, className }: DropZoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragActive(false);

      if (disabled) return;

      const files = Array.from(e.dataTransfer.files).filter((file) =>
        file.type.startsWith("video/")
      );

      if (files.length > 0) {
        onFilesSelected(files);
      }
    },
    [disabled, onFilesSelected]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled) return;

      const files = e.target.files ? Array.from(e.target.files) : [];
      if (files.length > 0) {
        onFilesSelected(files);
      }
    },
    [disabled, onFilesSelected]
  );

  return (
    <div
      className={cn(
        "relative border-2 border-dashed rounded-lg p-8 text-center transition-colors",
        isDragActive
          ? "border-neutral-400 bg-neutral-50"
          : "border-neutral-200 hover:border-neutral-300",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept="video/*"
        multiple
        onChange={handleChange}
        disabled={disabled}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
      />
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center">
          {isDragActive ? (
            <Upload className="h-6 w-6 text-neutral-600" />
          ) : (
            <Video className="h-6 w-6 text-neutral-600" />
          )}
        </div>
        <div>
          <p className="font-medium text-neutral-900">
            {isDragActive ? "Drop videos here" : "Drop videos or click to upload"}
          </p>
          <p className="text-sm text-neutral-500 mt-1">
            MP4, MOV, WebM, or other video formats
          </p>
        </div>
      </div>
    </div>
  );
}
