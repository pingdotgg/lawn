import test from "node:test";
import assert from "node:assert/strict";
import { threadComments } from "@convex/commentThreads";

test("keeps deeper replies on the root comment, in creation order", () => {
  const comments = [
    { _id: "root", timestampSeconds: 5, _creationTime: 1 },
    { _id: "child", parentId: "root", timestampSeconds: 5, _creationTime: 3 },
    { _id: "grandchild", parentId: "child", timestampSeconds: 9, _creationTime: 2 },
    { _id: "other", timestampSeconds: 1, _creationTime: 4 },
  ];

  assert.deepEqual(threadComments(comments), [
    { ...comments[3], replies: [] },
    { ...comments[0], replies: [comments[2], comments[1]] },
  ]);
  assert.deepEqual(
    comments.map((comment) => comment._id),
    ["root", "child", "grandchild", "other"],
  );
});

test("keeps a reply visible when its parent comment is missing", () => {
  const comments = [
    { _id: "orphan", parentId: "missing", timestampSeconds: 4, _creationTime: 1 },
    { _id: "under-orphan", parentId: "orphan", timestampSeconds: 8, _creationTime: 2 },
    { _id: "root", timestampSeconds: 2, _creationTime: 3 },
  ];

  assert.deepEqual(threadComments(comments), [
    { ...comments[2], replies: [] },
    { ...comments[0], replies: [comments[1]] },
  ]);
});

test("a parent cycle stays readable instead of hanging", () => {
  const comments = [
    { _id: "a", parentId: "b", timestampSeconds: 2, _creationTime: 2 },
    { _id: "b", parentId: "a", timestampSeconds: 1, _creationTime: 1 },
  ];

  const threaded = threadComments(comments);

  assert.deepEqual(
    threaded.map((comment) => comment._id),
    ["b", "a"],
  );
  assert.deepEqual(
    threaded.map((comment) => comment.replies),
    [[], []],
  );
});
