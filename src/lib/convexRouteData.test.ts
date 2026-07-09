import test from "node:test";
import assert from "node:assert/strict";
import type { ConvexReactClient } from "convex/react";
import { getFunctionName } from "convex/server";
import { api } from "@convex/_generated/api";
import { createRoutePrewarmIntent } from "@/lib/useRoutePrewarmIntent";
import {
  makeRouteQuerySpec,
  prewarmSpecs,
  resetPrewarmDedupeForTests,
} from "@/lib/convexRouteData";
import { prewarmTeam } from "../../app/routes/dashboard/-team.data";

test("prewarmSpecs dedupes within the dedupe window", () => {
  resetPrewarmDedupeForTests();

  const calls: Array<{ name: string; args: unknown }> = [];
  const convex = {
    prewarmQuery: ({ query, args }: { query: typeof api.teams.list; args: {} }) => {
      calls.push({ name: getFunctionName(query), args });
    },
  } as unknown as ConvexReactClient;

  const specs = [makeRouteQuerySpec(api.teams.list, {})];

  prewarmSpecs(convex, specs);
  prewarmSpecs(convex, specs);

  assert.equal(calls.length, 1);
  assert.equal(calls[0].name, "teams:list");
});

test("custom prewarm keys can redact bearer arguments", () => {
  const spec = makeRouteQuerySpec(
    api.folderShares.getFolder,
    { grantToken: "sensitive-grant", folderId: "folder-id" },
    "folder-share:folder:folder-id:metadata",
  );

  assert.equal(spec.key, "folder-share:folder:folder-id:metadata");
  assert.equal(spec.key.includes("sensitive-grant"), false);
  assert.equal(spec.redactErrorDetails, true);
});

test("default prewarm keys and warnings do not expose bearer arguments", () => {
  resetPrewarmDedupeForTests();
  const token = "sensitive-default-token";
  const spec = makeRouteQuerySpec(api.shareLinks.getByToken, { token });
  assert.equal(spec.key.includes(token), false);
  assert.equal(spec.redactErrorDetails, true);

  const warnings: unknown[][] = [];
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => warnings.push(args);
  try {
    const convex = {
      prewarmQuery: () => {
        throw new Error(token);
      },
    } as unknown as ConvexReactClient;
    prewarmSpecs(convex, [spec]);
  } finally {
    console.warn = originalWarn;
  }

  assert.equal(JSON.stringify(warnings).includes(token), false);
});

test("custom-key prewarm warnings do not expose bearer arguments", () => {
  resetPrewarmDedupeForTests();
  const warnings: unknown[][] = [];
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => warnings.push(args);
  try {
    const convex = {
      prewarmQuery: () => {
        throw new Error("sensitive-grant");
      },
    } as unknown as ConvexReactClient;
    prewarmSpecs(convex, [
      makeRouteQuerySpec(
        api.folderShares.getFolder,
        { grantToken: "sensitive-grant", folderId: "folder-id" },
        "folder-share:folder:folder-id:metadata",
      ),
    ]);
  } finally {
    console.warn = originalWarn;
  }

  assert.equal(JSON.stringify(warnings).includes("sensitive-grant"), false);
});

test("route prewarm intent handlers debounce repeated intent events", async () => {
  let calls = 0;
  const intent = createRoutePrewarmIntent(
    () => {
      calls += 1;
    },
    { debounceMs: 20 },
  );

  intent.handlers.onMouseEnter();
  intent.handlers.onFocus();
  intent.handlers.onTouchStart();

  await new Promise((resolve) => setTimeout(resolve, 35));

  assert.equal(calls, 1);

  intent.handlers.onMouseEnter();
  intent.handlers.onMouseLeave();
  await new Promise((resolve) => setTimeout(resolve, 35));

  assert.equal(calls, 1);
});

test("team dependent prewarm skips dependent query when resolveContext has no team", async () => {
  resetPrewarmDedupeForTests();

  const calls: Array<{ name: string; args: unknown }> = [];

  const convex = {
    prewarmQuery: ({
      query,
      args,
    }: {
      query: typeof api.workspace.resolveContext;
      args: unknown;
    }) => {
      calls.push({ name: getFunctionName(query), args });
    },
    query: async () => null,
  } as unknown as ConvexReactClient;

  await prewarmTeam(convex, { teamSlug: "missing-team" });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].name, "workspace:resolveContext");
});
