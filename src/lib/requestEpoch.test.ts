import assert from "node:assert/strict";
import test from "node:test";

import { createRequestEpoch } from "./requestEpoch";

test("a newer request invalidates an older delayed completion", async () => {
  const epoch = createRequestEpoch();
  const first = epoch.next();
  let resolveFirst: () => void = () => {};
  const firstResult = new Promise<void>((resolve) => {
    resolveFirst = resolve;
  });

  const second = epoch.next();
  resolveFirst();
  await firstResult;

  assert.equal(epoch.isCurrent(first), false);
  assert.equal(epoch.isCurrent(second), true);
});

test("context invalidation rejects a delayed mutation token", () => {
  const epoch = createRequestEpoch();
  const context = epoch.current();

  epoch.invalidate();

  assert.equal(epoch.isCurrent(context), false);
});
