import { usePaginatedQuery, useQuery, type ConvexReactClient } from "convex/react";
import { useEffect, useRef } from "react";
import { api } from "@convex/_generated/api";
import { makeRouteQuerySpec, prewarmSpecs } from "@/lib/convexRouteData";
import { createFolderSharePaginationMemory } from "@/lib/folderShareNavigation";

const FOLDER_SHARE_VIDEO_PAGE_SIZE = 32;
const FOLDER_SHARE_FOLDER_PAGE_SIZE = 40;

export function useFolderShareData(params: {
  token: string;
  grantToken?: string | null;
  folderId?: string;
  videoId?: string;
}) {
  const paginationMemoryRef = useRef(createFolderSharePaginationMemory());
  const folderKey = params.folderId ?? "root";
  const restoredItemCountRef = useRef({
    folderKey,
    grantToken: params.grantToken,
    folders: FOLDER_SHARE_FOLDER_PAGE_SIZE,
    videos: FOLDER_SHARE_VIDEO_PAGE_SIZE,
  });
  if (
    restoredItemCountRef.current.folderKey !== folderKey ||
    restoredItemCountRef.current.grantToken !== params.grantToken
  ) {
    restoredItemCountRef.current = {
      folderKey,
      grantToken: params.grantToken,
      folders: FOLDER_SHARE_FOLDER_PAGE_SIZE,
      videos: FOLDER_SHARE_VIDEO_PAGE_SIZE,
    };
  }
  const shareInfo = useQuery(api.folderShares.getByToken, { token: params.token });
  const protectedFolderArgs = params.grantToken
    ? { grantToken: params.grantToken, folderId: params.folderId }
    : "skip";
  const folder = useQuery(api.folderShares.getFolder, protectedFolderArgs);
  const {
    results: paginatedFolders,
    status: foldersStatus,
    loadMore: loadMoreFolders,
  } = usePaginatedQuery(api.folderShares.listFolders, protectedFolderArgs, {
    initialNumItems: FOLDER_SHARE_FOLDER_PAGE_SIZE,
  });
  const prewarmedFolderPage = useQuery(
    api.folderShares.listFolders,
    protectedFolderArgs !== "skip" && foldersStatus === "LoadingFirstPage"
      ? {
          ...protectedFolderArgs,
          paginationOpts: { cursor: null, numItems: FOLDER_SHARE_FOLDER_PAGE_SIZE },
        }
      : "skip",
  );
  const {
    results: paginatedVideos,
    status: videosStatus,
    loadMore: loadMoreVideos,
  } = usePaginatedQuery(api.folderShares.listVideos, protectedFolderArgs, {
    initialNumItems: FOLDER_SHARE_VIDEO_PAGE_SIZE,
  });
  const prewarmedVideoPage = useQuery(
    api.folderShares.listVideos,
    protectedFolderArgs !== "skip" && videosStatus === "LoadingFirstPage"
      ? {
          ...protectedFolderArgs,
          paginationOpts: { cursor: null, numItems: FOLDER_SHARE_VIDEO_PAGE_SIZE },
        }
      : "skip",
  );
  const folders =
    foldersStatus === "LoadingFirstPage"
      ? (prewarmedFolderPage?.page ?? paginatedFolders)
      : paginatedFolders;
  const videos =
    videosStatus === "LoadingFirstPage"
      ? (prewarmedVideoPage?.page ?? paginatedVideos)
      : paginatedVideos;
  const video = useQuery(
    api.folderShares.getVideo,
    params.grantToken && params.videoId
      ? { grantToken: params.grantToken, videoId: params.videoId }
      : "skip",
  );

  useEffect(() => {
    if (!params.grantToken || foldersStatus !== "CanLoadMore") return;
    const targetItemCount = paginationMemoryRef.current.getDepth(
      folderKey,
      "folders",
      FOLDER_SHARE_FOLDER_PAGE_SIZE,
    );
    if (restoredItemCountRef.current.folders >= targetItemCount) return;

    restoredItemCountRef.current.folders += FOLDER_SHARE_FOLDER_PAGE_SIZE;
    loadMoreFolders(FOLDER_SHARE_FOLDER_PAGE_SIZE);
  }, [folderKey, foldersStatus, loadMoreFolders, params.grantToken]);

  useEffect(() => {
    if (!params.grantToken || videosStatus !== "CanLoadMore") return;
    const targetItemCount = paginationMemoryRef.current.getDepth(
      folderKey,
      "videos",
      FOLDER_SHARE_VIDEO_PAGE_SIZE,
    );
    if (restoredItemCountRef.current.videos >= targetItemCount) return;

    restoredItemCountRef.current.videos += FOLDER_SHARE_VIDEO_PAGE_SIZE;
    loadMoreVideos(FOLDER_SHARE_VIDEO_PAGE_SIZE);
  }, [folderKey, loadMoreVideos, params.grantToken, videosStatus]);

  return {
    shareInfo,
    folder,
    folders,
    foldersStatus,
    foldersInitialLoading: foldersStatus === "LoadingFirstPage" && !prewarmedFolderPage,
    loadMoreFolders: () => {
      paginationMemoryRef.current.loadNextPage(folderKey, "folders", FOLDER_SHARE_FOLDER_PAGE_SIZE);
      restoredItemCountRef.current.folders += FOLDER_SHARE_FOLDER_PAGE_SIZE;
      loadMoreFolders(FOLDER_SHARE_FOLDER_PAGE_SIZE);
    },
    videos,
    videosStatus,
    videosInitialLoading: videosStatus === "LoadingFirstPage" && !prewarmedVideoPage,
    loadMoreVideos: () => {
      paginationMemoryRef.current.loadNextPage(folderKey, "videos", FOLDER_SHARE_VIDEO_PAGE_SIZE);
      restoredItemCountRef.current.videos += FOLDER_SHARE_VIDEO_PAGE_SIZE;
      loadMoreVideos(FOLDER_SHARE_VIDEO_PAGE_SIZE);
    },
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
