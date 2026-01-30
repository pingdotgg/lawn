"use client";

import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { Upload } from "lucide-react";

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
        "relative border-2 border-dashed rounded-xl p-12 text-center transition-all",
        isDragActive
          ? "border-red-500/50 bg-red-500/5"
          : "border-white/10 hover:border-white/20 bg-white/[0.02]",
        disabled && "opacity-40 cursor-not-allowed",
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
        <div
          className={cn(
            "w-14 h-14 rounded-xl flex items-center justify-center transition-colors",
            isDragActive
              ? "bg-red-500/20 text-red-500"
              : "bg-white/5 text-white/40"
          )}
        >
          <Upload className="h-6 w-6" />
        </div>
        <div>
          <p className="font-medium text-white">
            {isDragActive ? "Drop to upload" : "Drop videos or click to upload"}
          </p>
          <p className="text-sm text-white/40 mt-1">
            MP4, MOV, WebM supported
          </p>
        </div>
      </div>
    </div>
  );
}
