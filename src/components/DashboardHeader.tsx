import { Link } from "@tanstack/react-router";
import { UserButton } from "@clerk/tanstack-react-start";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme/ThemeToggle";
import React from "react";
import { useConvex } from "convex/react";
import type { Id } from "@convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { useRoutePrewarmIntent } from "@/lib/useRoutePrewarmIntent";
import { useFolderDropTarget } from "@/lib/dnd/useFolderDropTarget";
import type { FolderNode } from "@/lib/folderTree";
import type { DragPayload } from "@/lib/dnd/payload";
import { prewarmDashboardIndex } from "../../app/routes/dashboard/-index.data";

function ThemeToggleButton() {
  const { theme, toggleTheme, mounted } = useTheme();

  if (!mounted) return <div className="h-8 w-8" />;

  return (
    <button
      onClick={toggleTheme}
      className="flex h-8 w-8 items-center justify-center text-[#888] transition-colors hover:bg-[#e8e8e0] hover:text-[#1a1a1a]"
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode (⌘⇧L)`}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

/** Makes a breadcrumb segment a drop target so items can be dragged "up" the
 * tree onto an ancestor (or the team root for top level), file-manager style. */
export type BreadcrumbDrop = {
  teamId: Id<"teams">;
  /** Destination folder; omit for "top level" (folders only). */
  targetProjectId?: Id<"projects">;
  /** Team folder list, for the folder-into-descendant guard. */
  folders?: readonly FolderNode[];
  disabled?: boolean;
  onDropMove: (payload: DragPayload) => void;
};

export type PathSegment = {
  label: React.ReactNode;
  href?: string;
  prewarmIntentHandlers?: ReturnType<typeof useRoutePrewarmIntent>;
  drop?: BreadcrumbDrop;
};

function BreadcrumbSegment({
  path,
  isIntermediate,
}: {
  path: PathSegment;
  isIntermediate: boolean;
}) {
  const { ref, isDraggedOver, canDropHere } = useFolderDropTarget<HTMLDivElement>({
    disabled: !path.drop || path.drop.disabled,
    targetProjectId: path.drop?.targetProjectId,
    teamId: path.drop?.teamId as Id<"teams">,
    folders: path.drop?.folders,
    onMove: (payload) => path.drop?.onDropMove(payload),
  });

  return (
    <div
      ref={ref}
      className={cn(
        `${isIntermediate ? "hidden sm:flex" : "flex"} min-w-0 flex-shrink items-center`,
        isDraggedOver && canDropHere && "bg-[#2d5a2d]/10 text-[#2d5a2d]",
        isDraggedOver && !canDropHere && "bg-[#dc2626]/10",
      )}
    >
      <span className="mr-2 flex-shrink-0 text-[#888]">/</span>
      {path.href ? (
        <Link
          to={path.href}
          preload="intent"
          className={cn(
            "mr-2 truncate transition-colors hover:text-[#2d5a2d]",
            isDraggedOver && canDropHere && "text-[#2d5a2d] underline",
          )}
          {...path.prewarmIntentHandlers}
        >
          {path.label}
        </Link>
      ) : (
        <div className="mr-2 flex min-w-0 items-center gap-3 py-2">{path.label}</div>
      )}
    </div>
  );
}

export function DashboardHeader({
  children,
  paths = [],
}: {
  children?: React.ReactNode;
  paths?: PathSegment[];
}) {
  const convex = useConvex();
  const prewarmHomeIntentHandlers = useRoutePrewarmIntent(() => prewarmDashboardIndex(convex));

  return (
    <header className="grid flex-shrink-0 grid-cols-[1fr_auto] items-center border-b-2 border-[#1a1a1a] bg-[#f0f0e8] px-4 sm:grid-cols-[auto_1fr_auto] sm:px-6">
      {/* Breadcrumb */}
      <div className="flex min-h-11 min-w-0 items-center text-xl font-black tracking-tighter text-[#1a1a1a] sm:min-h-14">
        <Link
          to="/dashboard"
          preload="intent"
          className="mr-2 flex-shrink-0 transition-colors hover:text-[#2d5a2d]"
          {...prewarmHomeIntentHandlers}
        >
          lawn.
        </Link>
        {paths.map((path, index) => {
          const isIntermediate = paths.length >= 2 && index < paths.length - 1;
          return <BreadcrumbSegment key={index} path={path} isIntermediate={isIntermediate} />;
        })}
      </div>

      {/* User controls — pinned top-right */}
      <div className="col-start-2 row-start-1 flex h-8 items-center gap-4 border-l-2 border-[#1a1a1a]/10 pl-4 sm:col-start-3">
        <ThemeToggleButton />
        <UserButton
          appearance={{
            variables: {
              colorText: "#1a1a1a",
              colorTextSecondary: "#888",
              colorBackground: "#f0f0e8",
            },
            elements: {
              avatarBox: "w-8 h-8 rounded-none border-2 border-[#1a1a1a]",
              userButtonPopoverCard:
                "bg-[#f0f0e8] border-2 border-[#1a1a1a] rounded-none shadow-[8px_8px_0px_0px_var(--shadow-color)]",
              userButtonPopoverActionButton: "!text-[#1a1a1a] hover:!bg-[#e8e8e0] rounded-none",
              userButtonPopoverActionButtonText:
                "!text-[#1a1a1a] hover:!text-[#1a1a1a] font-mono font-bold",
              userButtonPopoverActionButtonIcon: "!text-[#1a1a1a] hover:!text-[#1a1a1a]",
              userButtonPopoverFooter: "hidden",
            },
          }}
        />
      </div>

      {/* Children — second row on mobile, middle column on desktop */}
      {children && (
        <div className="col-span-full flex min-w-0 items-center gap-2 overflow-x-auto pb-2 sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:h-14 sm:gap-3 sm:pb-0 sm:pl-4 [&>*]:shrink-0 sm:[&>*:first-child]:ml-auto">
          {children}
        </div>
      )}
    </header>
  );
}
