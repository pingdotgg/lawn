import { usePaginatedQuery, useQuery, type ConvexReactClient } from "convex/react";
import { api } from "@convex/_generated/api";
import { makeRouteQuerySpec, prewarmSpecs } from "@/lib/convexRouteData";

const FOLDER_SHARE_VIDEO_PAGE_SIZE = 32;
const FOLDER_SHARE_FOLDER_PAGE_SIZE = 40;

export function useFolderShareData(params: {
  token: string;
  grantToken?: string | null;
  folderId?: string;
  videoId?: string;
}) {
  const shareInfo = useQuery(api.folderShares.getByToken, { token: params.token });
  const protectedFolderArgs = params.grantToken
    ? { grantToken: params.grantToken, folderId: params.folderId }
    : "skip";
  const folder = useQuery(api.folderShares.getFolder, protectedFolderArgs);
  const {
    results: folders,
    status: foldersStatus,
    loadMore: loadMoreFolders,
  } = usePaginatedQuery(api.folderShares.listFolders, protectedFolderArgs, {
    initialNumItems: FOLDER_SHARE_FOLDER_PAGE_SIZE,
  });
  const {
    results: videos,
    status: videosStatus,
    loadMore: loadMoreVideos,
  } = usePaginatedQuery(api.folderShares.listVideos, protectedFolderArgs, {
    initialNumItems: FOLDER_SHARE_VIDEO_PAGE_SIZE,
  });
  const video = useQuery(
    api.folderShares.getVideo,
    params.grantToken && params.videoId
      ? { grantToken: params.grantToken, videoId: params.videoId }
      : "skip",
  );

  return {
    shareInfo,
    folder,
    folders,
    foldersStatus,
    foldersInitialLoading: foldersStatus === "LoadingFirstPage",
    loadMoreFolders: () => loadMoreFolders(FOLDER_SHARE_FOLDER_PAGE_SIZE),
    videos,
    videosStatus,
    videosInitialLoading: videosStatus === "LoadingFirstPage",
    loadMoreVideos: () => loadMoreVideos(FOLDER_SHARE_VIDEO_PAGE_SIZE),
    video,
  };
}

export function prewarmSharedFolder(
  convex: ConvexReactClient,
  params: { grantToken: string; folderId?: string },
) {
  const folderKey = params.folderId ?? "root";
  prewarmSpecs(convex, [
    makeRouteQuerySpec(
      api.folderShares.getFolder,
      params,
      `folder-share:folder:${folderKey}:metadata`,
    ),
    makeRouteQuerySpec(
      api.folderShares.listFolders,
      {
        ...params,
        paginationOpts: { cursor: null, numItems: FOLDER_SHARE_FOLDER_PAGE_SIZE },
      },
      `folder-share:folder:${folderKey}:folders`,
    ),
    makeRouteQuerySpec(
      api.folderShares.listVideos,
      {
        ...params,
        paginationOpts: { cursor: null, numItems: FOLDER_SHARE_VIDEO_PAGE_SIZE },
      },
      `folder-share:folder:${folderKey}:videos`,
    ),
  ]);
}

export function prewarmSharedVideo(
  convex: ConvexReactClient,
  params: { grantToken: string; videoId: string },
) {
  prewarmSpecs(convex, [
    makeRouteQuerySpec(api.folderShares.getVideo, params, `folder-share:video:${params.videoId}`),
  ]);
}
