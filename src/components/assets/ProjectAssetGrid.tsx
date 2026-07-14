"use client";

import { useAction, useMutation } from "convex/react";
import { useCallback, useEffect, useState } from "react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
  Download,
  FileAudio,
  FileText,
  File as FileIcon,
  Image as ImageIcon,
  Loader2,
  MoreVertical,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { triggerDownload } from "@/lib/download";
import { cn, formatBytes, formatRelativeTime } from "@/lib/utils";
import type { ProjectAssetKind } from "@/lib/projectAssetTypes";

export type ProjectAssetListItem = {
  _id: Id<"projectAssets">;
  _creationTime: number;
  title: string;
  filename: string;
  kind: ProjectAssetKind;
  contentType: string;
  fileSize?: number;
  status: "uploading" | "ready" | "failed";
  uploadError?: string;
  uploaderName: string;
};

function AssetKindIcon({ kind, className }: { kind: ProjectAssetKind; className?: string }) {
  if (kind === "image") return <ImageIcon className={className} />;
  if (kind === "audio") return <FileAudio className={className} />;
  if (kind === "document") return <FileText className={className} />;
  return <FileIcon className={className} />;
}

function kindLabel(kind: ProjectAssetKind) {
  switch (kind) {
    case "image":
      return "Image";
    case "audio":
      return "Audio";
    case "document":
      return "Document";
    default:
      return "File";
  }
}

function AssetImageThumb({
  assetId,
  title,
  onOpen,
}: {
  assetId: Id<"projectAssets">;
  title: string;
  onOpen: (url: string) => void;
}) {
  const getPreviewUrl = useAction(api.projectAssetActions.getAssetPreviewUrl);
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void getPreviewUrl({ assetId })
      .then((result) => {
        if (!cancelled) setUrl(result.url);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [assetId, getPreviewUrl]);

  if (failed || !url) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#e8e8e0]">
        {failed ? (
          <ImageIcon className="h-8 w-8 text-[#888]" />
        ) : (
          <Loader2 className="h-6 w-6 animate-spin text-[#888]" />
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      className="h-full w-full cursor-pointer"
      onClick={() => onOpen(url)}
      aria-label={`Preview ${title}`}
    >
      <img src={url} alt={title} className="h-full w-full object-cover" draggable={false} />
    </button>
  );
}

export function ProjectAssetGrid({
  assets,
  canManage,
  className,
}: {
  assets: ProjectAssetListItem[];
  canManage: boolean;
  className?: string;
}) {
  const removeAsset = useMutation(api.projectAssets.remove);
  const getDownloadUrl = useAction(api.projectAssetActions.getAssetDownloadUrl);
  const [lightbox, setLightbox] = useState<{ url: string; title: string } | null>(null);
  const [busyId, setBusyId] = useState<Id<"projectAssets"> | null>(null);

  const handleDownload = useCallback(
    async (asset: ProjectAssetListItem) => {
      setBusyId(asset._id);
      try {
        const result = await getDownloadUrl({ assetId: asset._id });
        triggerDownload(result.url, result.filename);
      } catch (error) {
        console.error("Failed to download asset:", error);
        window.alert(error instanceof Error ? error.message : "Download failed");
      } finally {
        setBusyId(null);
      }
    },
    [getDownloadUrl],
  );

  const handleDelete = useCallback(
    async (asset: ProjectAssetListItem) => {
      if (!confirm(`Delete “${asset.filename}”? This can't be undone.`)) return;
      setBusyId(asset._id);
      try {
        await removeAsset({ assetId: asset._id });
      } catch (error) {
        console.error("Failed to delete asset:", error);
        window.alert(error instanceof Error ? error.message : "Delete failed");
      } finally {
        setBusyId(null);
      }
    },
    [removeAsset],
  );

  if (assets.length === 0) return null;

  return (
    <div className={cn("p-6 pb-0", className)}>
      <h2 className="mb-3 text-xs font-black tracking-wider text-[#888] uppercase">Files</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {assets.map((asset) => {
          const isReady = asset.status === "ready";
          const isBusy = busyId === asset._id;

          return (
            <div
              key={asset._id}
              className="group flex flex-col border-2 border-[#1a1a1a] bg-[#f0f0e8] shadow-[4px_4px_0px_0px_var(--shadow-color)]"
            >
              <div className="relative aspect-video overflow-hidden border-b-2 border-[#1a1a1a] bg-[#e8e8e0]">
                {asset.kind === "image" && isReady ? (
                  <AssetImageThumb
                    assetId={asset._id}
                    title={asset.title}
                    onOpen={(url) => setLightbox({ url, title: asset.title })}
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-[#888]">
                    <AssetKindIcon kind={asset.kind} className="h-10 w-10" />
                    <span className="text-[11px] font-bold tracking-wider uppercase">
                      {kindLabel(asset.kind)}
                    </span>
                  </div>
                )}

                {asset.status !== "ready" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                    <span className="text-xs font-bold tracking-wider text-white uppercase">
                      {asset.status === "uploading" && "Uploading..."}
                      {asset.status === "failed" && "Failed"}
                    </span>
                  </div>
                )}

                <div className="absolute top-2 right-2 opacity-100 transition-opacity md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex h-8 w-8 cursor-pointer items-center justify-center bg-black/60 text-white hover:bg-black/80"
                        aria-label={`Open actions for ${asset.filename}`}
                        disabled={isBusy}
                      >
                        <MoreVertical className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {isReady && (
                        <DropdownMenuItem
                          onClick={() => {
                            void handleDownload(asset);
                          }}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </DropdownMenuItem>
                      )}
                      {canManage && (
                        <DropdownMenuItem
                          className="text-[#dc2626] focus:text-[#dc2626]"
                          onClick={() => {
                            void handleDelete(asset);
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="flex flex-1 flex-col gap-1 p-3">
                <p className="truncate text-[15px] leading-tight font-black text-[#1a1a1a]">
                  {asset.filename}
                </p>
                <div className="mt-auto flex items-center gap-2 text-[11px] text-[#888]">
                  <span className="font-mono uppercase">{kindLabel(asset.kind)}</span>
                  {typeof asset.fileSize === "number" && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">{formatBytes(asset.fileSize)}</span>
                    </>
                  )}
                  <span className="ml-auto font-mono">
                    {formatRelativeTime(asset._creationTime)}
                  </span>
                </div>
                {asset.status === "failed" && asset.uploadError && (
                  <p className="mt-1 line-clamp-2 text-[11px] text-[#dc2626]">{asset.uploadError}</p>
                )}
                {isReady && asset.kind !== "image" && (
                  <button
                    type="button"
                    className="mt-2 inline-flex items-center justify-center gap-1.5 border-2 border-[#1a1a1a] bg-[#1a1a1a] px-2 py-1.5 text-xs font-bold text-[#f0f0e8] hover:bg-[#2d5a2d] disabled:opacity-50"
                    onClick={() => void handleDownload(asset)}
                    disabled={isBusy}
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={Boolean(lightbox)} onOpenChange={(open) => !open && setLightbox(null)}>
        <DialogContent className="max-w-4xl border-2 border-[#1a1a1a] bg-[#1a1a1a] text-[#f0f0e8] sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="truncate pr-8 text-sm font-black text-[#f0f0e8]">
              {lightbox?.title ?? "Preview"}
            </DialogTitle>
          </DialogHeader>
          {lightbox && (
            <div className="flex max-h-[80vh] items-center justify-center bg-[#111] p-2">
              <img
                src={lightbox.url}
                alt={lightbox.title}
                className="max-h-[75vh] max-w-full object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
