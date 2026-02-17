import test from "node:test";
import assert from "node:assert/strict";
import type { ConvexReactClient } from "convex/react";
import { getFunctionName } from "convex/server";
import { api } from "@convex/_generated/api";
import {
  createRoutePrewarmIntent,
} from "@/lib/useRoutePrewarmIntent";
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
    prewarmQuery: ({ query, args }: { query: typeof api.workspace.resolveContext; args: unknown }) => {
      calls.push({ name: getFunctionName(query), args });
    },
    query: async () => null,
  } as unknown as ConvexReactClient;

  await prewarmTeam(convex, { teamSlug: "missing-team" });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].name, "workspace:resolveContext");
});
