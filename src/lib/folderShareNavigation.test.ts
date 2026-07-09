import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  createFolderSharePaginationMemory,
  findFolderShareReturnFocus,
  folderShareFolderFocusId,
  folderShareRouteKey,
  folderShareVideoFocusId,
  type FolderShareNavigationOrigin,
  type FolderShareRouteKey,
} from "./folderShareNavigation";

describe("folder share pagination memory", () => {
  test("keeps independently loaded folder and video depths for each folder", () => {
    const memory = createFolderSharePaginationMemory();

    memory.loadNextPage("root", "folders", 40);
    memory.loadNextPage("root", "videos", 32);
    memory.loadNextPage("root", "videos", 32);
    memory.loadNextPage("child", "videos", 32);

    assert.equal(memory.getDepth("root", "folders", 40), 80);
    assert.equal(memory.getDepth("root", "videos", 32), 96);
    assert.equal(memory.getDepth("child", "folders", 40), 40);
    assert.equal(memory.getDepth("child", "videos", 32), 64);
  });
});

describe("folder share focus origins", () => {
  test("finds the immediate origin when returning from a video", () => {
    const folderRoute = folderShareRouteKey({ folderId: "folder-a" });
    const videoRoute = folderShareRouteKey({ folderId: "folder-a", videoId: "video-a" });
    const origins = new Map<FolderShareRouteKey, FolderShareNavigationOrigin>([
      [
        videoRoute,
        {
          routeKey: folderRoute,
          focusId: folderShareVideoFocusId("video-a"),
        },
      ],
    ]);

    assert.equal(
      findFolderShareReturnFocus(origins, videoRoute, folderRoute),
      folderShareVideoFocusId("video-a"),
    );
  });

  test("walks nested origins when returning directly to an ancestor", () => {
    const rootRoute = folderShareRouteKey({});
    const parentRoute = folderShareRouteKey({ folderId: "folder-a" });
    const childRoute = folderShareRouteKey({ folderId: "folder-b" });
    const origins = new Map<FolderShareRouteKey, FolderShareNavigationOrigin>([
      [
        parentRoute,
        {
          routeKey: rootRoute,
          focusId: folderShareFolderFocusId("folder-a"),
        },
      ],
      [
        childRoute,
        {
          routeKey: parentRoute,
          focusId: folderShareFolderFocusId("folder-b"),
        },
      ],
    ]);

    assert.equal(
      findFolderShareReturnFocus(origins, childRoute, rootRoute),
      folderShareFolderFocusId("folder-a"),
    );
    assert.equal(findFolderShareReturnFocus(origins, parentRoute, childRoute), undefined);
  });

  test("stops safely if stale origins contain a cycle", () => {
    const firstRoute = folderShareRouteKey({ folderId: "folder-a" });
    const secondRoute = folderShareRouteKey({ folderId: "folder-b" });
    const origins = new Map<FolderShareRouteKey, FolderShareNavigationOrigin>([
      [
        firstRoute,
        {
          routeKey: secondRoute,
          focusId: folderShareFolderFocusId("folder-b"),
        },
      ],
      [
        secondRoute,
        {
          routeKey: firstRoute,
          focusId: folderShareFolderFocusId("folder-a"),
        },
      ],
    ]);

    assert.equal(
      findFolderShareReturnFocus(origins, firstRoute, folderShareRouteKey({})),
      undefined,
    );
  });
});
