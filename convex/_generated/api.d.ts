/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as billing from "../billing.js";
import type * as billingHelpers from "../billingHelpers.js";
import type * as comments from "../comments.js";
import type * as crons from "../crons.js";
import type * as http from "../http.js";
import type * as mux from "../mux.js";
import type * as muxActions from "../muxActions.js";
import type * as projectAssetActions from "../projectAssetActions.js";
import type * as projectAssetTypes from "../projectAssetTypes.js";
import type * as projectAssets from "../projectAssets.js";
import type * as projects from "../projects.js";
import type * as s3 from "../s3.js";
import type * as s3Multipart from "../s3Multipart.js";
import type * as security from "../security.js";
import type * as shareAccess from "../shareAccess.js";
import type * as shareLinks from "../shareLinks.js";
import type * as teams from "../teams.js";
import type * as uploadLimits from "../uploadLimits.js";
import type * as videoActions from "../videoActions.js";
import type * as videoPresence from "../videoPresence.js";
import type * as videos from "../videos.js";
import type * as workspace from "../workspace.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  billing: typeof billing;
  billingHelpers: typeof billingHelpers;
  comments: typeof comments;
  crons: typeof crons;
  http: typeof http;
  mux: typeof mux;
  muxActions: typeof muxActions;
  projectAssetActions: typeof projectAssetActions;
  projectAssetTypes: typeof projectAssetTypes;
  projectAssets: typeof projectAssets;
  projects: typeof projects;
  s3: typeof s3;
  s3Multipart: typeof s3Multipart;
  security: typeof security;
  shareAccess: typeof shareAccess;
  shareLinks: typeof shareLinks;
  teams: typeof teams;
  uploadLimits: typeof uploadLimits;
  videoActions: typeof videoActions;
  videoPresence: typeof videoPresence;
  videos: typeof videos;
  workspace: typeof workspace;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  presence: import("@convex-dev/presence/_generated/component.js").ComponentApi<"presence">;
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
  stripe: import("@convex-dev/stripe/_generated/component.js").ComponentApi<"stripe">;
};
