import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { VideoWatcher } from "@/lib/useVideoPresence";

function initials(name: string) {
  const cleaned = name.trim();
  if (!cleaned) return "??";

  const pieces = cleaned.split(/\s+/).slice(0, 2);
  return pieces
    .map((piece) => piece[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
}

export function VideoWatchers({
  watchers,
  className,
}: {
  watchers: VideoWatcher[];
  className?: string;
}) {
  if (watchers.length === 0) return null;

  const visible = watchers.slice(0, 5);
  const overflow = Math.max(0, watchers.length - visible.length);

  return (
    <div
      className={cn("inline-flex items-center", className)}
      title={watchers.map((w) => w.displayName).join(", ")}
    >
      <div className="flex -space-x-1.5">
        {visible.map((watcher) => (
          <Avatar
            key={watcher.userId}
            className="h-5 w-5 border-2 border-[#f0f0e8] ring-0"
          >
            {watcher.avatarUrl ? (
              <AvatarImage src={watcher.avatarUrl} alt={watcher.displayName} />
            ) : null}
            <AvatarFallback className="text-[8px] font-bold leading-none bg-[#e8e8e0] text-[#1a1a1a]">
              {initials(watcher.displayName)}
            </AvatarFallback>
          </Avatar>
        ))}
        {overflow > 0 && (
          <span className="inline-flex h-5 min-w-5 items-center justify-center border-2 border-[#f0f0e8] bg-[#e8e8e0] text-[8px] font-bold text-[#888] rounded-full px-1">
            +{overflow}
          </span>
        )}
      </div>
    </div>
  );
}
