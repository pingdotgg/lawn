"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

interface UploadButtonProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
  children?: React.ReactNode;
}

export function UploadButton({
  onFilesSelected,
  disabled,
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
    // Reset input so same file can be selected again
    e.target.value = "";
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        multiple
        onChange={handleChange}
        className="hidden"
      />
      <Button onClick={handleClick} disabled={disabled}>
        {children || (
          <>
            <Upload className="mr-2 h-4 w-4" />
            Upload video
          </>
        )}
      </Button>
    </>
  );
}
