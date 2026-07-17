import { convexToJson, type Value } from "convex/values";
import { getFunctionName } from "convex/server";
import type { ConvexReactClient } from "convex/react";
import type { FunctionArgs, FunctionReference } from "convex/server";

export const PREWARM_DEBOUNCE_MS = 120;
export const PREWARM_EXTEND_MS = 8_000;
export const PREWARM_DEDUPE_MS = 3_000;

export type RouteQuerySpec<Query extends FunctionReference<"query">> = {
  query: Query;
  args: FunctionArgs<Query>;
  key: string;
};

// Dedupe keys can end up in console warnings; hash the serialized args so
// secrets passed as query args (e.g. share grant tokens) never appear there.
function fingerprintQueryArgs(value: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `${(hash >>> 0).toString(36)}:${value.length}`;
}

function buildQueryKey(queryName: string, args: unknown): string {
  const serializedArgs = JSON.stringify(convexToJson(args as Value));
  return `${queryName}:${fingerprintQueryArgs(serializedArgs)}`;
}

export function makeRouteQuerySpec<Query extends FunctionReference<"query">>(
  query: Query,
  args: FunctionArgs<Query>,
  dedupeKey?: string,
): RouteQuerySpec<Query> {
  return {
    query,
    args,
    key: dedupeKey ?? buildQueryKey(getFunctionName(query), args),
  };
}

type PrewarmSpecsOptions = {
  dedupeMs?: number;
  extendSubscriptionFor?: number;
};

const lastPrewarmedAt = new Map<string, number>();

export function prewarmSpecs(
  convex: ConvexReactClient,
  specs: RouteQuerySpec<FunctionReference<"query">>[],
  options: PrewarmSpecsOptions = {},
) {
  const dedupeMs = options.dedupeMs ?? PREWARM_DEDUPE_MS;
  const extendSubscriptionFor = options.extendSubscriptionFor ?? PREWARM_EXTEND_MS;
  const now = Date.now();

  for (const spec of specs) {
    const previous = lastPrewarmedAt.get(spec.key);
    if (previous !== undefined && now - previous < dedupeMs) {
      continue;
    }

    lastPrewarmedAt.set(spec.key, now);

    try {
      convex.prewarmQuery({
        query: spec.query,
        args: spec.args,
        extendSubscriptionFor,
      });
    } catch {
      // Prewarm failures should never block navigation.
      console.warn("Convex prewarm failed", { key: spec.key });
    }
  }
}

export function resetPrewarmDedupeForTests() {
  lastPrewarmedAt.clear();
}
