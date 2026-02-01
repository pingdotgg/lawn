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
        "relative border-2 border-dashed rounded-lg p-12 text-center transition-all",
        isDragActive
          ? "border-[#7cb87c]/50 bg-[#7cb87c]/5"
          : "border-[#2a4a2a] hover:border-[#3a6a3a] bg-[#0f1f0f]/50",
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
            "w-14 h-14 rounded-lg flex items-center justify-center transition-colors",
            isDragActive
              ? "bg-[#7cb87c]/20 text-[#7cb87c]"
              : "bg-[#1a2a1a] text-[#4a6a4a]"
          )}
        >
          <Upload className="h-6 w-6" />
        </div>
        <div>
          <p className="font-medium text-[#c8e6c8]">
            {isDragActive ? "Drop to upload" : "Drop videos or click to upload"}
          </p>
          <p className="text-sm text-[#4a6a4a] mt-1">
            MP4, MOV, WebM supported
          </p>
        </div>
      </div>
    </div>
  );
}
