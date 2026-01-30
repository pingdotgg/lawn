"use client";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";

interface QualitySelectorProps {
  currentQuality: string;
  availableQualities: string[];
  onQualityChange: (quality: string) => void;
}

export function QualitySelector({
  currentQuality,
  availableQualities,
  onQualityChange,
}: QualitySelectorProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 px-2">
          <Settings className="h-4 w-4 mr-1" />
          {currentQuality}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {availableQualities.map((quality) => (
          <DropdownMenuItem
            key={quality}
            onClick={() => onQualityChange(quality)}
            className={currentQuality === quality ? "bg-neutral-100" : ""}
          >
            {quality}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
