"use client";

import { useRef } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  PROJECT_ASSET_ACCEPT,
  isAllowedProjectAsset,
  isVideoUploadFile,
} from "@/lib/projectAssetTypes";

interface UploadButtonProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
  multiple?: boolean;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
  children?: React.ReactNode;
  /** Restrict to videos only (e.g. new version upload). */
  accept?: string;
  videoOnly?: boolean;
}

export function UploadButton({
  onFilesSelected,
  disabled,
  multiple = true,
  variant,
  size,
  className,
  children,
  accept,
  videoOnly = false,
}: UploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.files ? Array.from(e.target.files) : [];
    const files = videoOnly
      ? raw.filter((file) => isVideoUploadFile(file.name, file.type))
      : raw.filter(
          (file) =>
            isVideoUploadFile(file.name, file.type) || isAllowedProjectAsset(file.name, file.type),
        );
    if (files.length > 0) {
      onFilesSelected(files);
    }
    e.target.value = "";
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept ?? (videoOnly ? "video/*" : PROJECT_ASSET_ACCEPT)}
        multiple={multiple}
        onChange={handleChange}
        className="hidden"
      />
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        onClick={handleClick}
        disabled={disabled}
      >
        {children || (
          <>
            <Plus className="mr-1.5 h-4 w-4" />
            Upload
          </>
        )}
      </Button>
    </>
  );
}
