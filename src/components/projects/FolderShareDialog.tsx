import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Copy, Link2, Loader2, Trash2 } from "lucide-react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { copyTextToClipboard } from "@/lib/clipboard";
import { folderSharePath } from "@/lib/routes";
import { createRequestEpoch } from "@/lib/requestEpoch";

type FolderShareDialogProps = {
  projectId: Id<"projects">;
  folderName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function absoluteShareUrl(token: string) {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return `${origin}${folderSharePath(token)}`;
}

export function FolderShareDialog({
  projectId,
  folderName,
  open,
  onOpenChange,
}: FolderShareDialogProps) {
  const link = useQuery(api.folderShares.getForFolder, open ? { projectId } : "skip");
  const createLink = useMutation(api.folderShares.create);
  const revokeLink = useMutation(api.folderShares.revoke);
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [revokedLocally, setRevokedLocally] = useState(false);
  const [pendingAction, setPendingAction] = useState<"create" | "copy" | "revoke" | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const requestEpochRef = useRef(createRequestEpoch());
  const activeProjectIdRef = useRef(projectId);
  const activeOpenRef = useRef(open);
  activeProjectIdRef.current = projectId;
  activeOpenRef.current = open;

  const resetLocalState = useCallback(() => {
    setCreatedToken(null);
    setRevokedLocally(false);
    setPendingAction(null);
    setMessage(null);
  }, []);

  const isRequestCurrent = useCallback(
    (requestEpoch: number, requestProjectId: Id<"projects">) =>
      requestEpochRef.current.isCurrent(requestEpoch) &&
      activeProjectIdRef.current === requestProjectId &&
      activeOpenRef.current,
    [],
  );

  useEffect(() => {
    requestEpochRef.current.invalidate();
    resetLocalState();
    return () => requestEpochRef.current.invalidate();
  }, [open, projectId, resetLocalState]);

  const token = revokedLocally ? null : (createdToken ?? link?.token);
  const shareUrl = useMemo(() => (token ? absoluteShareUrl(token) : ""), [token]);

  const copyUrl = async (url: string, requestEpoch: number, requestProjectId: Id<"projects">) => {
    const copied = await copyTextToClipboard(url);
    if (!isRequestCurrent(requestEpoch, requestProjectId)) return false;
    if (!copied) {
      setMessage({
        tone: "error",
        text: "The link is ready, but it could not be copied automatically.",
      });
      return false;
    }
    setMessage({ tone: "success", text: "Folder link copied." });
    return true;
  };

  const handleCreate = async () => {
    if (pendingAction) return;
    const requestEpoch = requestEpochRef.current.next();
    const requestProjectId = projectId;
    setPendingAction("create");
    setMessage(null);
    try {
      const result = await createLink({ projectId });
      if (!isRequestCurrent(requestEpoch, requestProjectId)) return;
      setRevokedLocally(false);
      setCreatedToken(result.token);
      await copyUrl(absoluteShareUrl(result.token), requestEpoch, requestProjectId);
    } catch {
      if (!isRequestCurrent(requestEpoch, requestProjectId)) return;
      setMessage({
        tone: "error",
        text: "Could not create the folder link. Try again.",
      });
    } finally {
      if (isRequestCurrent(requestEpoch, requestProjectId)) {
        setPendingAction(null);
      }
    }
  };

  const handleCopy = async () => {
    if (!shareUrl || pendingAction) return;
    const requestEpoch = requestEpochRef.current.next();
    const requestProjectId = projectId;
    setPendingAction("copy");
    setMessage(null);
    try {
      await copyUrl(shareUrl, requestEpoch, requestProjectId);
    } finally {
      if (isRequestCurrent(requestEpoch, requestProjectId)) {
        setPendingAction(null);
      }
    }
  };

  const handleRevoke = async () => {
    if (pendingAction) return;
    if (
      !window.confirm(
        "Revoke this Lawn folder link? It will immediately block the folder and new playback sessions.",
      )
    ) {
      return;
    }

    const requestEpoch = requestEpochRef.current.next();
    const requestProjectId = projectId;
    setPendingAction("revoke");
    setMessage(null);
    try {
      await revokeLink({ projectId });
      if (!isRequestCurrent(requestEpoch, requestProjectId)) return;
      setRevokedLocally(true);
      setCreatedToken(null);
      setMessage({ tone: "success", text: "Folder link revoked." });
    } catch {
      if (!isRequestCurrent(requestEpoch, requestProjectId)) return;
      setMessage({
        tone: "error",
        text: "Could not revoke the folder link. Try again.",
      });
    } finally {
      if (isRequestCurrent(requestEpoch, requestProjectId)) {
        setPendingAction(null);
      }
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    activeOpenRef.current = nextOpen;
    if (!nextOpen) {
      requestEpochRef.current.invalidate();
      resetLocalState();
    }
    onOpenChange(nextOpen);
  };

  const isLoading = open && link === undefined && !createdToken;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share folder</DialogTitle>
          <DialogDescription>
            Anyone with this link can browse {folderName} and its sub-folders and watch ready
            videos. Comment text and author names are visible. Moving something outside this folder
            removes it from the share.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-[#888]" role="status">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading link…
            </div>
          ) : token ? (
            <div className="space-y-3">
              <label
                htmlFor="folder-share-url"
                className="text-xs font-black tracking-wider uppercase"
              >
                Public folder link
              </label>
              <div className="flex gap-2">
                <Input
                  id="folder-share-url"
                  value={shareUrl}
                  readOnly
                  className="min-w-0 font-mono text-xs"
                  onFocus={(event) => event.currentTarget.select()}
                  onClick={(event) => event.currentTarget.select()}
                />
                <Button
                  type="button"
                  variant="outline"
                  aria-label="Copy folder link"
                  disabled={pendingAction !== null}
                  onClick={() => void handleCopy()}
                >
                  {pendingAction === "copy" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">Copy</span>
                </Button>
              </div>
              <p className="text-xs text-[#888]">
                The same link stays active until you revoke it. Playback already started may
                continue briefly.
              </p>
            </div>
          ) : (
            <div className="border-2 border-dashed border-[#1a1a1a]/40 p-4 text-sm text-[#666]">
              This folder does not have a public link yet.
            </div>
          )}

          {message ? (
            <p
              role={message.tone === "error" ? "alert" : "status"}
              aria-live={message.tone === "error" ? "assertive" : "polite"}
              className={
                message.tone === "error" ? "text-sm text-[#dc2626]" : "text-sm text-[#2d5a2d]"
              }
            >
              {message.text}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          {token ? (
            <Button
              type="button"
              variant="destructive"
              disabled={pendingAction !== null}
              onClick={() => void handleRevoke()}
            >
              {pendingAction === "revoke" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Revoke link
            </Button>
          ) : (
            <Button
              type="button"
              disabled={isLoading || pendingAction !== null}
              onClick={() => void handleCreate()}
            >
              {pendingAction === "create" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Link2 className="h-4 w-4" />
              )}
              Create and copy link
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
