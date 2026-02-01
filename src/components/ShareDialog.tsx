"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Copy,
  Check,
  Plus,
  Trash2,
  Eye,
  Download,
  Lock,
  ExternalLink,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatRelativeTime } from "@/lib/utils";

interface ShareDialogProps {
  videoId: Id<"videos">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareDialog({ videoId, open, onOpenChange }: ShareDialogProps) {
  const shareLinks = useQuery(api.shareLinks.list, { videoId });
  const createShareLink = useMutation(api.shareLinks.create);
  const deleteShareLink = useMutation(api.shareLinks.remove);

  const [isCreating, setIsCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [newLinkOptions, setNewLinkOptions] = useState({
    expiresInDays: undefined as number | undefined,
    allowDownload: false,
    password: undefined as string | undefined,
  });

  const handleCreateLink = async () => {
    setIsCreating(true);
    try {
      await createShareLink({
        videoId,
        expiresInDays: newLinkOptions.expiresInDays,
        allowDownload: newLinkOptions.allowDownload,
        password: newLinkOptions.password,
      });
      setNewLinkOptions({
        expiresInDays: undefined,
        allowDownload: false,
        password: undefined,
      });
    } catch (error) {
      console.error("Failed to create share link:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyLink = (token: string) => {
    const url = `${window.location.origin}/share/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(token);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteLink = async (linkId: Id<"shareLinks">) => {
    if (!confirm("Are you sure you want to delete this share link?")) return;
    try {
      await deleteShareLink({ linkId });
    } catch (error) {
      console.error("Failed to delete share link:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Share video</DialogTitle>
          <DialogDescription>
            Create shareable links to let others view this video without signing in.
          </DialogDescription>
        </DialogHeader>

        {/* Create new link section */}
        <div className="space-y-4 border-2 border-[#1a1a1a] p-4 bg-[#e8e8e0]">
          <h3 className="font-bold text-sm text-[#1a1a1a]">Create new link</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-[#888]">Expiration</label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between mt-1">
                    {newLinkOptions.expiresInDays
                      ? `${newLinkOptions.expiresInDays} days`
                      : "Never"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem
                    onClick={() =>
                      setNewLinkOptions((o) => ({ ...o, expiresInDays: undefined }))
                    }
                  >
                    Never
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      setNewLinkOptions((o) => ({ ...o, expiresInDays: 1 }))
                    }
                  >
                    1 day
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      setNewLinkOptions((o) => ({ ...o, expiresInDays: 7 }))
                    }
                  >
                    7 days
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      setNewLinkOptions((o) => ({ ...o, expiresInDays: 30 }))
                    }
                  >
                    30 days
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div>
              <label className="text-sm text-[#888]">Allow download</label>
              <Button
                variant={newLinkOptions.allowDownload ? "default" : "outline"}
                className="w-full mt-1"
                onClick={() =>
                  setNewLinkOptions((o) => ({
                    ...o,
                    allowDownload: !o.allowDownload,
                  }))
                }
              >
                <Download className="mr-2 h-4 w-4" />
                {newLinkOptions.allowDownload ? "Enabled" : "Disabled"}
              </Button>
            </div>
          </div>

          <div>
            <label className="text-sm text-[#888]">Password (optional)</label>
            <Input
              type="password"
              placeholder="Leave empty for no password"
              value={newLinkOptions.password || ""}
              onChange={(e) =>
                setNewLinkOptions((o) => ({
                  ...o,
                  password: e.target.value || undefined,
                }))
              }
              className="mt-1"
            />
          </div>

          <Button onClick={handleCreateLink} disabled={isCreating} className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            {isCreating ? "Creating..." : "Create share link"}
          </Button>
        </div>

        <Separator />

        {/* Existing links */}
        <div className="space-y-2">
          <h3 className="font-bold text-sm text-[#1a1a1a]">Active links</h3>
          {shareLinks === undefined ? (
            <p className="text-sm text-[#888]">Loading...</p>
          ) : shareLinks.length === 0 ? (
            <p className="text-sm text-[#888]">No share links yet</p>
          ) : (
            <div className="space-y-2">
              {shareLinks.map((link) => (
                <div
                  key={link._id}
                  className="flex items-center justify-between p-3 border-2 border-[#1a1a1a]"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <code className="text-sm bg-[#e8e8e0] px-2 py-0.5 font-mono truncate max-w-[200px]">
                        /share/{link.token}
                      </code>
                      {link.isExpired && (
                        <Badge variant="destructive">Expired</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-[#888]">
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {link.viewCount} views
                      </span>
                      {link.allowDownload && (
                        <span className="flex items-center gap-1">
                          <Download className="h-3 w-3" />
                          Download
                        </span>
                      )}
                      {link.password && (
                        <span className="flex items-center gap-1">
                          <Lock className="h-3 w-3" />
                          Protected
                        </span>
                      )}
                      {link.expiresAt && (
                        <span>
                          Expires {formatRelativeTime(link.expiresAt)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleCopyLink(link.token)}
                    >
                      {copiedId === link.token ? (
                        <Check className="h-4 w-4 text-[#2d5a2d]" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        window.open(`/share/${link.token}`, "_blank")
                      }
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-[#dc2626] hover:text-[#dc2626]"
                      onClick={() => handleDeleteLink(link._id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
