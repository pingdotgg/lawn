export function dashboardHomePath() {
  return "/dashboard";
}

export function teamHomePath(teamSlug: string) {
  return `/dashboard/${teamSlug}`;
}

export function teamSettingsPath(teamSlug: string) {
  return `/dashboard/${teamSlug}/settings`;
}

export function projectPath(teamSlug: string, projectId: string) {
  return `/dashboard/${teamSlug}/${projectId}`;
}

export function videoPath(teamSlug: string, projectId: string, videoId: string) {
  return `/dashboard/${teamSlug}/${projectId}/${videoId}`;
}

export function watchPath(publicId: string) {
  return `/watch/${publicId}`;
}

export function folderSharePath(
  token: string,
  options: { folderId?: string; videoId?: string } = {},
) {
  const path = `/folder-share/${encodeURIComponent(token)}`;
  const search = new URLSearchParams();
  if (options.folderId) search.set("folder", options.folderId);
  if (options.videoId) search.set("video", options.videoId);
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}
