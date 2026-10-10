import { useEffect, useRef, useState, type ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Command } from "cmdk";
import { useConvex, useQuery } from "convex/react";
import { useNavigate } from "@tanstack/react-router";
import {
  CreditCard,
  Film,
  Folder,
  Home,
  LayoutGrid,
  Loader2,
  Moon,
  Search,
  Settings,
  Sun,
  Upload,
  Users,
  type LucideIcon,
} from "lucide-react";
import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import { highlightRanges, matchRank, queryWords } from "@convex/searchText";
import { Dialog, DialogOverlay, DialogPortal } from "@/components/ui/dialog";
import { useTheme } from "@/components/theme/ThemeToggle";
import { useCommandPalette, type PaletteCommand } from "@/lib/commandPalette";
import { useDashboardUploadContext } from "@/lib/dashboardUploadContext";
import {
  dashboardHomePath,
  projectPath,
  teamHomePath,
  teamSettingsPath,
  videoPath,
} from "@/lib/routes";
import { prewarmProject } from "./-project.data";
import { prewarmVideo } from "./-video.data";

const SEARCH_DEBOUNCE_MS = 120;
const PREWARM_DELAY_MS = 120;
const VIDEO_FILE_ACCEPT = "video/*,.mp4,.mov,.m4v,.webm,.avi,.mkv";

type TeamRole = Doc<"teamMembers">["role"];

type PaletteItem = {
  value: string;
  label: string;
  detail?: string;
  icon: LucideIcon;
  run: () => void;
  prewarm?: () => void;
};

function useDebounced<T>(value: T, ms: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timeout);
  }, [value, ms]);
  return debounced;
}

// Holds the last loaded value while a query reloads, so results don't flash.
// Changing `key` drops the held value so one team's results never show in another.
function useStableValue<T>(value: T | undefined, key: string | undefined) {
  const [stable, setStable] = useState({ key, value });
  if (stable.key !== key || (value !== undefined && value !== stable.value)) {
    setStable({ key, value });
    return value;
  }
  return stable.value;
}

const matches = (words: string[], text: string) =>
  words.length === 0 || matchRank(text, words) <= 2;

// Highlights the start of each title word or subword that a query word prefixes.
function Highlight({ text, words }: { text: string; words: string[] }) {
  const ranges = highlightRanges(text, words);
  if (ranges.length === 0) return text;
  const parts = ranges.flatMap(([start, end], index) => [
    text.slice(ranges[index - 1]?.[1] ?? 0, start),
    <mark key={start} className="bg-transparent text-[#2d5a2d] underline">
      {text.slice(start, end)}
    </mark>,
  ]);
  return [...parts, text.slice(ranges.at(-1)![1])];
}

function Group({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <Command.Group
      heading={heading}
      className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-[#888]"
    >
      {children}
    </Command.Group>
  );
}

function Item({ item, words }: { item: PaletteItem; words: string[] }) {
  const Icon = item.icon;
  return (
    <Command.Item
      value={item.value}
      onSelect={item.run}
      className="flex cursor-pointer items-center gap-3 px-3 py-2 text-[#1a1a1a] data-[selected=true]:bg-[var(--surface-alt)]"
    >
      <Icon className="h-4 w-4 shrink-0 text-[#888]" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold">
          <Highlight text={item.label} words={words} />
        </p>
        {item.detail && <p className="truncate font-mono text-xs text-[#888]">{item.detail}</p>}
      </div>
    </Command.Item>
  );
}

export function CommandPalette({ teamSlug, teamRole }: { teamSlug?: string; teamRole?: TeamRole }) {
  const palette = useCommandPalette();
  const open = palette?.open ?? false;
  const convex = useConvex();
  const navigate = useNavigate();
  const { requestUpload } = useDashboardUploadContext();
  const { theme, toggleTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prewarmTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [search, setSearch] = useState("");
  const trimmed = search.trim();
  const term = useDebounced(trimmed, SEARCH_DEBOUNCE_MS);
  const words = queryWords(search);

  const teams = useQuery(api.teams.list, open ? {} : "skip");
  const recent = useQuery(api.search.recent, open && teamSlug ? { teamSlug } : "skip");
  const liveResults = useQuery(
    api.search.search,
    open && teamSlug && term ? { teamSlug, query: term } : "skip",
  );
  const results = useStableValue(liveResults, teamSlug);
  const searching = Boolean(teamSlug && trimmed);
  const pending = searching && (liveResults === undefined || term !== trimmed);

  const setOpen = (next: boolean) => palette?.setOpen(next);
  // Every close path (Escape, selection, the Cmd/Ctrl+K toggle) starts fresh next time.
  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);
  // Dismissing returns focus to where it was; running a command leaves focus to
  // whatever the command opened or navigated to.
  const ranCommandRef = useRef(false);
  const closeForCommand = () => {
    ranCommandRef.current = true;
    setOpen(false);
  };
  const go = (to: string, hash?: string) => {
    closeForCommand();
    void navigate({ to, hash });
  };
  const runAndClose = (run: () => void) => () => {
    closeForCommand();
    run();
  };

  const commands: PaletteCommand[] = [
    ...(teamSlug
      ? [
          {
            id: "team-home",
            label: "Team home",
            keywords: ["projects", "folders"],
            icon: Home,
            run: () => go(teamHomePath(teamSlug)),
          },
          {
            id: "settings",
            label: "Team settings",
            keywords: ["preferences", "rename"],
            icon: Settings,
            run: () => go(teamSettingsPath(teamSlug)),
          },
          ...(teamRole === "owner"
            ? [
                {
                  id: "billing",
                  label: "Billing",
                  keywords: ["plan", "subscription", "upgrade", "invoice", "stripe"],
                  icon: CreditCard,
                  run: () => go(teamSettingsPath(teamSlug), "billing"),
                },
              ]
            : []),
          {
            id: "members",
            label: "Members",
            keywords: ["people", "users", "team"],
            icon: Users,
            run: () => go(teamSettingsPath(teamSlug), "members"),
          },
        ]
      : []),
    ...(teamRole !== "viewer"
      ? [
          {
            id: "upload",
            label: "Upload video",
            keywords: ["file", "new"],
            icon: Upload,
            // The file picker must open inside this key/click handler.
            run: () => {
              fileInputRef.current?.click();
              closeForCommand();
            },
          },
        ]
      : []),
    ...(palette?.pageCommands ?? []).map((command) => ({
      ...command,
      run: runAndClose(command.run),
    })),
    {
      id: "all-teams",
      label: "All teams",
      keywords: ["dashboard", "home"],
      icon: LayoutGrid,
      run: () => go(dashboardHomePath()),
    },
    {
      id: "theme",
      label: theme === "dark" ? "Switch to light theme" : "Switch to dark theme",
      keywords: ["dark", "light", "mode", "appearance"],
      icon: theme === "dark" ? Sun : Moon,
      run: runAndClose(toggleTheme),
    },
  ];

  // Commands whose label matches rank above keyword-only matches.
  const commandItems: PaletteItem[] = commands
    .filter((command) => matches(words, [command.label, ...(command.keywords ?? [])].join(" ")))
    .map((command) => ({ command, labelMatch: matches(words, command.label) }))
    .sort((a, b) => Number(b.labelMatch) - Number(a.labelMatch))
    .map(({ command }) => ({
      value: `command:${command.id}`,
      label: command.label,
      icon: command.icon,
      run: command.run,
    }));

  const fileItems: PaletteItem[] = !teamSlug
    ? []
    : ((searching ? results : recent) ?? []).map((result) =>
        result.kind === "video"
          ? {
              value: `video:${result.videoId}`,
              label: result.title,
              detail: result.path,
              icon: Film,
              run: () => go(videoPath(teamSlug, result.projectId, result.videoId)),
              prewarm: () =>
                prewarmVideo(convex, {
                  teamSlug,
                  projectId: result.projectId,
                  videoId: result.videoId,
                }),
            }
          : {
              value: `folder:${result.projectId}`,
              label: result.title,
              detail: result.path || undefined,
              icon: Folder,
              run: () => go(projectPath(teamSlug, result.projectId)),
              prewarm: () => prewarmProject(convex, { teamSlug, projectId: result.projectId }),
            },
      );

  const teamItems: PaletteItem[] = (teams ?? [])
    .filter((team) => team.slug !== teamSlug && matches(words, `${team.name} ${team.slug}`))
    .map((team) => ({
      value: `team:${team._id}`,
      label: team.name,
      detail: team.slug,
      icon: LayoutGrid,
      run: () => go(teamHomePath(team.slug)),
    }));

  const itemsByValue = new Map(
    [...commandItems, ...fileItems, ...teamItems].map((item) => [item.value, item]),
  );

  // Warm the route's queries for whatever is highlighted, so opening it is instant.
  const handleHighlight = (value: string) => {
    clearTimeout(prewarmTimeoutRef.current);
    const prewarm = itemsByValue.get(value)?.prewarm;
    if (prewarm) prewarmTimeoutRef.current = setTimeout(prewarm, PREWARM_DELAY_MS);
  };
  useEffect(() => () => clearTimeout(prewarmTimeoutRef.current), []);

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept={VIDEO_FILE_ACCEPT}
        multiple
        className="hidden"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          if (files.length > 0) requestUpload(files);
        }}
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogPortal>
          <DialogOverlay />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            onCloseAutoFocus={(event) => {
              if (ranCommandRef.current) event.preventDefault();
              ranCommandRef.current = false;
            }}
            className="fixed top-[12vh] left-1/2 z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 border-2 border-[#1a1a1a] bg-[#f0f0e8] shadow-[8px_8px_0px_0px_var(--shadow-color)]"
          >
            <DialogPrimitive.Title className="sr-only">Search</DialogPrimitive.Title>
            <Command
              label="Search"
              shouldFilter={false}
              loop
              vimBindings={false}
              onValueChange={handleHighlight}
            >
              <div className="flex items-center gap-3 border-b-2 border-[#1a1a1a] px-4">
                <Search className="h-4 w-4 shrink-0 text-[#888]" />
                <Command.Input
                  value={search}
                  onValueChange={setSearch}
                  placeholder={
                    teamSlug ? "Search folders, videos, and commands" : "Search commands and teams"
                  }
                  className="h-14 min-w-0 flex-1 bg-transparent font-mono text-sm text-[#1a1a1a] outline-none placeholder:text-[#888]"
                />
                <span className="flex w-4 shrink-0 justify-center">
                  {pending && <Loader2 className="h-4 w-4 animate-spin text-[#888]" />}
                </span>
              </div>
              <Command.List className="h-[min(60vh,420px)] overflow-y-auto overscroll-contain pb-2">
                {!pending && (
                  <Command.Empty className="px-4 py-6 text-sm text-[#888]">
                    No results
                  </Command.Empty>
                )}
                {commandItems.length > 0 && (
                  <Group heading="Commands">
                    {commandItems.map((item) => (
                      <Item key={item.value} item={item} words={words} />
                    ))}
                  </Group>
                )}
                {fileItems.length > 0 && (
                  <Group heading={searching ? "Folders and videos" : "Recent videos"}>
                    {fileItems.map((item) => (
                      <Item key={item.value} item={item} words={words} />
                    ))}
                  </Group>
                )}
                {teamItems.length > 0 && (
                  <Group heading="Teams">
                    {teamItems.map((item) => (
                      <Item key={item.value} item={item} words={words} />
                    ))}
                  </Group>
                )}
              </Command.List>
            </Command>
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>
    </>
  );
}
