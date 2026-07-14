/** Apex domain used for branded team share hosts. */
export const SHARE_ROOT_DOMAIN = "lawn.video";

/**
 * Subdomains reserved for app infrastructure. Teams cannot claim these as
 * share hosts (or as team slugs, which double as share subdomains).
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

/** True when the host is lawn.video or any *.lawn.video subdomain. */
export function isShareRootHost(hostname: string | null | undefined): boolean {
  if (!hostname) return false;
  const host = normalizeHostname(hostname);
  return host === SHARE_ROOT_DOMAIN || host.endsWith(`.${SHARE_ROOT_DOMAIN}`);
}

/**
 * Extract the team share subdomain from a hostname.
 * Returns null for apex, non-lawn hosts, multi-level subs, or reserved names.
 */
export function parseTeamShareSubdomain(hostname: string | null | undefined): string | null {
  if (!hostname) return null;
  const host = normalizeHostname(hostname);
  if (host === SHARE_ROOT_DOMAIN) return null;

  const suffix = `.${SHARE_ROOT_DOMAIN}`;
  if (!host.endsWith(suffix)) return null;

  const sub = host.slice(0, -suffix.length);
  // Reject empty or multi-level (e.g. a.b.lawn.video).
  if (!sub || sub.includes(".")) return null;
  if (RESERVED_SHARE_SUBDOMAINS.has(sub)) return null;
  return sub;
}

export function isReservedShareSubdomain(slug: string): boolean {
  return RESERVED_SHARE_SUBDOMAINS.has(slug.trim().toLowerCase());
}

/** Canonical origin for a team's branded share host. */
export function teamShareOrigin(teamSlug: string): string {
  return `https://${teamSlug}.${SHARE_ROOT_DOMAIN}`;
}

/**
 * Base URL for public watch / restricted share links.
 *
 * On lawn.video production hosts, always use the team subdomain so copied
 * links are branded. On local/preview origins, fall back to the current
 * origin so the share flow keeps working without wildcard DNS.
 */
export function getTeamShareBaseUrl(
  teamSlug: string | null | undefined,
  currentOrigin?: string,
): string {
  const origin =
    currentOrigin ??
    (typeof window !== "undefined" ? window.location.origin : `https://${SHARE_ROOT_DOMAIN}`);

  if (!teamSlug) return origin;

  try {
    const url = new URL(origin);
    if (isShareRootHost(url.hostname)) {
      return teamShareOrigin(teamSlug);
    }
    return url.origin;
  } catch {
    return teamShareOrigin(teamSlug);
  }
}

export function publicWatchUrl(
  teamSlug: string | null | undefined,
  publicId: string,
  currentOrigin?: string,
): string {
  return `${getTeamShareBaseUrl(teamSlug, currentOrigin)}/watch/${publicId}`;
}

export function restrictedShareUrl(
  teamSlug: string | null | undefined,
  token: string,
  currentOrigin?: string,
): string {
  return `${getTeamShareBaseUrl(teamSlug, currentOrigin)}/share/${token}`;
}

/** Display-friendly host+path for share UI (no protocol). */
export function displayShareUrl(absoluteUrl: string): string {
  try {
    const url = new URL(absoluteUrl);
    return `${url.host}${url.pathname}${url.search}`;
  } catch {
    return absoluteUrl;
  }
}

export function getBrowserHostname(): string | null {
  if (typeof window === "undefined") return null;
  return window.location.hostname;
}

export function getBrowserOrigin(): string | null {
  if (typeof window === "undefined") return null;
  return window.location.origin;
}
