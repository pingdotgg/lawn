import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

/** Apex domain used for branded team share hosts. Keep in sync with src/lib/shareHost.ts. */
export const SHARE_ROOT_DOMAIN = "lawn.video";

/**
 * Subdomains reserved for app infrastructure. Keep in sync with src/lib/shareHost.ts.
 */
export const RESERVED_SHARE_SUBDOMAINS = new Set([
  "www",
  "app",
  "api",
  "clerk",
  "cdn",
  "static",
  "assets",
  "mail",
  "email",
  "admin",
  "dashboard",
  "status",
  "docs",
  "help",
  "support",
  "blog",
  "dev",
  "staging",
  "preview",
  "test",
  "beta",
  "alpha",
  "m",
  "stream",
  "image",
  "media",
  "upload",
  "uploads",
  "auth",
  "accounts",
  "billing",
  "webhook",
  "webhooks",
  "convex",
]);

function normalizeHostname(hostname: string): string {
  return hostname.trim().toLowerCase().split(":")[0] ?? "";
}

/**
 * Extract the team share subdomain from a request host.
 * Returns null for apex lawn.video, non-lawn hosts, multi-level subs, or reserved names.
 * When null, host isolation is not applied (legacy apex / local / preview links).
 */
export function parseTeamShareSubdomain(hostname: string | null | undefined): string | null {
  if (!hostname) return null;
  const host = normalizeHostname(hostname);
  if (host === SHARE_ROOT_DOMAIN) return null;

  const suffix = `.${SHARE_ROOT_DOMAIN}`;
  if (!host.endsWith(suffix)) return null;

  const sub = host.slice(0, -suffix.length);
  if (!sub || sub.includes(".")) return null;
  if (RESERVED_SHARE_SUBDOMAINS.has(sub)) return null;
  return sub;
}

export function isReservedShareSubdomain(slug: string): boolean {
  return RESERVED_SHARE_SUBDOMAINS.has(slug.trim().toLowerCase());
}

type DbCtx = Pick<QueryCtx, "db"> | Pick<MutationCtx, "db">;

/** Resolve the owning team's slug for a video, or null if the chain is broken. */
export async function getTeamSlugForVideo(
  ctx: DbCtx,
  videoId: Id<"videos">,
): Promise<string | null> {
  const video = await ctx.db.get(videoId);
  if (!video) return null;
  const project = await ctx.db.get(video.projectId);
  if (!project) return null;
  const team = await ctx.db.get(project.teamId);
  return team?.slug ?? null;
}

/**
 * When the request host is a team share subdomain, require the video's team
 * slug to match. Apex / non-lawn hosts skip isolation so existing links keep
 * working.
 */
export async function videoMatchesShareHost(
  ctx: DbCtx,
  videoId: Id<"videos">,
  shareHost: string | null | undefined,
): Promise<boolean> {
  const expectedSlug = parseTeamShareSubdomain(shareHost);
  if (!expectedSlug) return true;

  const teamSlug = await getTeamSlugForVideo(ctx, videoId);
  return teamSlug === expectedSlug;
}
