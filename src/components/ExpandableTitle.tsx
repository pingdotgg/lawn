import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export function isTitleOverflowing(
  container: Pick<HTMLElement, "clientWidth">,
  text: Pick<HTMLElement, "scrollWidth">,
) {
  return text.scrollWidth > container.clientWidth + 1;
}

export function ExpandableTitle({ title, className }: { title: string; className?: string }) {
  const [expanded, setExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);
  const measurementRef = useRef<HTMLSpanElement>(null);

  useEffect(() => setExpanded(false), [title]);

  useLayoutEffect(() => {
    if (!containerRef.current || !measurementRef.current) return;
    const container = containerRef.current;
    const measurement = measurementRef.current;
    const measure = () => setCanExpand(isTitleOverflowing(container, measurement));
    measure();

    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, [title]);

  const titleClassName = cn(
    "block w-full max-w-full min-w-0 text-left",
    expanded ? "break-words whitespace-normal" : "truncate",
    className,
  );

  return (
    <span ref={containerRef} title={title} className={cn("relative", titleClassName)}>
      <span
        ref={measurementRef}
        className="pointer-events-none invisible absolute whitespace-nowrap"
        aria-hidden="true"
      >
        {title}
      </span>
      {canExpand || expanded ? (
        <button
          type="button"
          aria-expanded={expanded}
          className={cn(
            "block w-full cursor-pointer text-left",
            expanded ? "break-words whitespace-normal" : "truncate",
          )}
          onClick={(event) => {
            event.stopPropagation();
            setExpanded((value) => !value);
          }}
          onKeyDown={(event) => event.stopPropagation()}
        >
          {title}
        </button>
      ) : (
        title
      )}
    </span>
  );
}
