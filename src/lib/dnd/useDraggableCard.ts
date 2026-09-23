import { useEffect, useRef, useState } from "react";
import { draggable } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { setCustomNativeDragPreview } from "@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview";
import type { DragPayload } from "./payload";
import { makeDragData } from "./payload";

type UseDraggableCardArgs = {
  /** The payload describing the dragged item, attached to the drag. */
  payload: DragPayload;
  /** When true, dragging is disabled (e.g. viewers can't move). */
  disabled?: boolean;
};

/** Label shown inside the custom drag-preview chip. */
function previewLabel(payload: DragPayload): string {
  return payload.kind === "video" ? payload.title : payload.name;
}

/**
 * Makes the returned `ref` element a pragmatic-dnd draggable. A drag only starts
 * after real pointer movement, so plain clicks still fire the element's
 * `onClick` (open) and the dropdown trigger keeps working.
 *
 * Renders a small brutalist preview chip via `setCustomNativeDragPreview` so the
 * native ghost is replaced by an on-brand badge.
 */
export function useDraggableCard<T extends HTMLElement>({
  payload,
  disabled = false,
}: UseDraggableCardArgs) {
  const ref = useRef<T | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Keep the latest payload available to the imperative callbacks without
  // re-registering the draggable on every render.
  const payloadRef = useRef(payload);
  payloadRef.current = payload;

  useEffect(() => {
    const element = ref.current;
    if (!element || disabled) return;

    // Controls marked `data-no-drag` (e.g. selection checkboxes) never start a drag.
    let pressStartedOnNoDrag = false;
    const handlePointerDown = (event: PointerEvent) => {
      pressStartedOnNoDrag =
        event.target instanceof Element && event.target.closest("[data-no-drag]") !== null;
    };
    element.addEventListener("pointerdown", handlePointerDown, true);

    const cleanupDraggable = draggable({
      element,
      canDrag: () => !pressStartedOnNoDrag,
      getInitialData: () => makeDragData(payloadRef.current),
      onGenerateDragPreview: ({ nativeSetDragImage }) => {
        setCustomNativeDragPreview({
          nativeSetDragImage,
          render: ({ container }) => {
            const chip = document.createElement("div");
            chip.textContent = `▸ ${previewLabel(payloadRef.current)}`;
            chip.style.maxWidth = "240px";
            chip.style.overflow = "hidden";
            chip.style.whiteSpace = "nowrap";
            chip.style.textOverflow = "ellipsis";
            chip.style.padding = "6px 10px";
            chip.style.border = "2px solid #1a1a1a";
            chip.style.background = "#f0f0e8";
            chip.style.color = "#1a1a1a";
            chip.style.fontWeight = "900";
            chip.style.fontSize = "13px";
            chip.style.lineHeight = "1";
            chip.style.borderRadius = "0";
            container.appendChild(chip);
          },
        });
      },
      onDragStart: () => setIsDragging(true),
      onDrop: () => setIsDragging(false),
    });

    return () => {
      element.removeEventListener("pointerdown", handlePointerDown, true);
      cleanupDraggable();
    };
  }, [disabled]);

  return { ref, isDragging };
}
