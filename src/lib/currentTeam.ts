const LAST_TEAM_STORAGE_KEY = "lawn:last-team-slug";

export function readLastTeamSlug() {
  if (typeof window === "undefined") return undefined;
  try {
    return window.localStorage.getItem(LAST_TEAM_STORAGE_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

export function writeLastTeamSlug(slug: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LAST_TEAM_STORAGE_KEY, slug);
  } catch {
    // Storage can be unavailable (private mode, quota); the switcher still works without it.
  }
}

/** The team in the URL wins, then the last team the user picked, then their first team. */
export function pickCurrentTeam<T extends { slug: string }>(
  teams: readonly T[],
  routeSlug: string | undefined,
  lastSlug: string | undefined,
) {
  return (
    teams.find((team) => team.slug === routeSlug) ??
    teams.find((team) => team.slug === lastSlug) ??
    teams[0]
  );
}
