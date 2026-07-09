export type FolderShareRouteKey = `folder:${string}` | `video:${string}`;
export type FolderShareFocusId = `folder:${string}` | `video:${string}`;

export type FolderShareNavigationOrigin = {
  routeKey: FolderShareRouteKey;
  focusId: FolderShareFocusId;
};

type PaginationCollection = "folders" | "videos";

export function folderShareRouteKey(params: { folderId?: string; videoId?: string }) {
  return params.videoId
    ? (`video:${params.videoId}` as const)
    : (`folder:${params.folderId ?? "root"}` as const);
}

export function folderShareFolderFocusId(folderId: string) {
  return `folder:${folderId}` as const;
}

export function folderShareVideoFocusId(videoId: string) {
  return `video:${videoId}` as const;
}

export function findFolderShareReturnFocus(
  origins: ReadonlyMap<FolderShareRouteKey, FolderShareNavigationOrigin>,
  fromRouteKey: FolderShareRouteKey,
  toRouteKey: FolderShareRouteKey,
) {
  const visited = new Set<FolderShareRouteKey>();
  let routeKey = fromRouteKey;

  while (!visited.has(routeKey)) {
    visited.add(routeKey);
    const origin = origins.get(routeKey);
    if (!origin) return;
    if (origin.routeKey === toRouteKey) return origin.focusId;
    routeKey = origin.routeKey;
  }
}

export function createFolderSharePaginationMemory() {
  const depthByFolder = new Map<string, Partial<Record<PaginationCollection, number>>>();

  const getDepth = (folderKey: string, collection: PaginationCollection, fallback: number) =>
    depthByFolder.get(folderKey)?.[collection] ?? fallback;

  return {
    getDepth,
    loadNextPage: (folderKey: string, collection: PaginationCollection, pageSize: number) => {
      const current = depthByFolder.get(folderKey);
      const nextDepth = getDepth(folderKey, collection, pageSize) + pageSize;
      depthByFolder.set(folderKey, { ...current, [collection]: nextDepth });
      return nextDepth;
    },
  };
}
