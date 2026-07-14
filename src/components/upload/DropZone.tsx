"use client";

import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { Upload } from "lucide-react";
import {
  PROJECT_ASSET_ACCEPT,
  isAllowedProjectAsset,
  isVideoUploadFile,
} from "@/lib/projectAssetTypes";

interface DropZoneProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
  className?: string;
}

function isSupportedUploadFile(file: File) {
  return isVideoUploadFile(file.name, file.type) || isAllowedProjectAsset(file.name, file.type);
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

      const files = Array.from(e.dataTransfer.files).filter(isSupportedUploadFile);

      if (files.length > 0) {
        onFilesSelected(files);
      }
    },
    [disabled, onFilesSelected],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled) return;

      const files = e.target.files
        ? Array.from(e.target.files).filter(isSupportedUploadFile)
        : [];
      if (files.length > 0) {
        onFilesSelected(files);
      }
      e.target.value = "";
    },
    [disabled, onFilesSelected],
  );

  return (
    <div
      className={cn(
        "relative border-2 border-dashed p-12 text-center transition-all",
        isDragActive
          ? "border-[#2d5a2d] bg-[#2d5a2d]/5"
          : "border-[#1a1a1a] bg-[#f0f0e8] hover:border-[#888]",
        disabled && "cursor-not-allowed opacity-40",
        className,
      )}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept={PROJECT_ASSET_ACCEPT}
        multiple
        onChange={handleChange}
        disabled={disabled}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
      />
      <div className="flex flex-col items-center gap-4">
        <div
          className={cn(
            "flex h-14 w-14 items-center justify-center border-2 border-[#1a1a1a] transition-colors",
            isDragActive ? "bg-[#2d5a2d] text-[#f0f0e8]" : "bg-[#e8e8e0] text-[#888]",
          )}
        >
          <Upload className="h-6 w-6" />
        </div>
        <div>
          <p className="font-bold text-[#1a1a1a]">
            {isDragActive ? "Drop to upload" : "Drop files or click to upload"}
          </p>
          <p className="mt-1 text-sm text-[#888]">
            Videos, images, audio, and documents supported
          </p>
        </div>
      </div>
    </div>
  );
}
