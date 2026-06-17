import { useEffect, useRef, useState } from "react";
import { dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import type { Id } from "@convex/_generated/dataModel";
import { collectDescendantIds, type FolderNode } from "@/lib/folderTree";
import type { DragPayload } from "./payload";
import { readDragPayload } from "./payload";

type UseFolderDropTargetArgs = {
  /**
   * The destination this target represents. A folder id moves items *into* that
   * folder; `undefined` means "top level" (only folders can be dropped there).
   */
  targetProjectId?: Id<"projects">;
  /** Team of this target, for the cross-team affordance check. */
  teamId: Id<"teams">;
  /** When true, this element is not a drop target at all (e.g. viewers). */
  disabled?: boolean;
  /**
   * The team's flat folder list, used to reject dropping a folder into one of
   * its own descendants (mirrors the server cycle guard). Optional — when a
   * target can never receive a folder payload it can be omitted.
   */
  folders?: readonly FolderNode[];
  /** Called with the source payload when a legal drop completes on this target. */
  onMove: (payload: DragPayload) => void;
};

type CanDropContext = {
  targetProjectId?: Id<"projects">;
  teamId: Id<"teams">;
  /** Resolves the dragged folder's descendant set (incl. itself), memoized. */
  descendantsOf: (folderId: Id<"projects">) => Set<Id<"projects">>;
};

/**
 * Decides whether `payload` may be dropped on this target. Mirrors the server
 * guards so illegal targets show the red reject state instead of accepting then
 * erroring. The server mutations remain the source of truth.
 */
function computeCanDrop(payload: DragPayload, ctx: CanDropContext): boolean {
  const { targetProjectId, teamId } = ctx;

  // Cross-team is never reachable in the UI, but guard anyway for affordance.
  if (payload.teamId !== teamId) return false;

  if (payload.kind === "video") {
    // Videos always need a folder — top level (no targetProjectId) is illegal.
    if (!targetProjectId) return false;
    // Same folder is a no-op: don't highlight.
    if (payload.sourceProjectId === targetProjectId) return false;
    return true;
  }

  // Folder payload.
  // Dropping a folder onto "top level": legal unless it's already at top level.
  if (!targetProjectId) {
    return payload.sourceParentId !== undefined;
  }
  // Can't drop a folder into itself or one of its own descendants.
  if (ctx.descendantsOf(payload.projectId).has(targetProjectId)) return false;
  // Same parent is a no-op: don't highlight.
  if (payload.sourceParentId === targetProjectId) return false;
  return true;
}

/**
 * Registers the returned `ref` element as a drop target for internal video /
 * folder drags. Returns `isDraggedOver` (an internal drag is currently over
 * this element) and `canDropHere` (that drag is a legal drop) so the caller can
 * render the green accept vs. red reject affordance.
 */
export function useFolderDropTarget<T extends HTMLElement>(
  args: UseFolderDropTargetArgs,
) {
  const { targetProjectId, teamId, disabled, folders, onMove } = args;
  const ref = useRef<T | null>(null);
  const [isDraggedOver, setIsDraggedOver] = useState(false);
  const [canDropHere, setCanDropHere] = useState(false);

  // Latest values for the imperative callbacks without re-registering each render.
  const stateRef = useRef({ targetProjectId, teamId, folders, onMove });
  stateRef.current = { targetProjectId, teamId, folders, onMove };

  useEffect(() => {
    const element = ref.current;
    if (!element || disabled) return;

    // Recompute descendants on each canDrop call (cheap for these small folder
    // lists) so the guard always reflects the latest folder tree — it changes as
    // items are moved, so caching across drags would go stale.
    const ctx = (): CanDropContext => ({
      targetProjectId: stateRef.current.targetProjectId,
      teamId: stateRef.current.teamId,
      descendantsOf: (folderId) =>
        collectDescendantIds(folderId, stateRef.current.folders ?? []),
    });

    return dropTargetForElements({
      element,
      canDrop: ({ source }) => {
        const payload = readDragPayload(source.data);
        if (!payload) return false;
        return computeCanDrop(payload, ctx());
      },
      getData: () => ({ targetProjectId: stateRef.current.targetProjectId }),
      onDragEnter: ({ source }) => {
        const payload = readDragPayload(source.data);
        if (!payload) return;
        setIsDraggedOver(true);
        setCanDropHere(computeCanDrop(payload, ctx()));
      },
      onDragLeave: () => {
        setIsDraggedOver(false);
        setCanDropHere(false);
      },
      onDrop: ({ source }) => {
        setIsDraggedOver(false);
        setCanDropHere(false);
        const payload = readDragPayload(source.data);
        if (!payload) return;
        if (!computeCanDrop(payload, ctx())) return;
        stateRef.current.onMove(payload);
      },
    });
  }, [disabled]);

  return { ref, isDraggedOver, canDropHere };
}
