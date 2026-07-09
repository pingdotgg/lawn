import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { folderSharePath } from "./routes";

describe("folderSharePath", () => {
  test("builds the durable root share URL", () => {
    assert.equal(folderSharePath("share-token"), "/folder-share/share-token");
  });

  test("keeps descendant folder and video state in an encoded query", () => {
    assert.equal(
      folderSharePath("share token", {
        folderId: "folder/id",
        videoId: "video id",
      }),
      "/folder-share/share%20token?folder=folder%2Fid&video=video+id",
    );
  });
});
