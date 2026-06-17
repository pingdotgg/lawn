"use client";

import { useRef } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface UploadButtonProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
  multiple?: boolean;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
  children?: React.ReactNode;
}

export function UploadButton({
  onFilesSelected,
  disabled,
  multiple = true,
  variant,
  size,
  className,
  children,
}: UploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
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
        accept="video/*"
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
