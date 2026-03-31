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

export function folderPath(teamSlug: string, projectId: string, folderId: string) {
  return `/dashboard/${teamSlug}/${projectId}/f/${folderId}`;
}

export function videoPath(teamSlug: string, projectId: string, videoId: string) {
  return `/dashboard/${teamSlug}/${projectId}/${videoId}`;
}
