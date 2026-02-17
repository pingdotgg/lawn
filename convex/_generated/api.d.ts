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
import type * as comments from "../comments.js";
import type * as http from "../http.js";
import type * as mux from "../mux.js";
import type * as muxActions from "../muxActions.js";
import type * as projects from "../projects.js";
import type * as s3 from "../s3.js";
import type * as shareLinks from "../shareLinks.js";
import type * as teams from "../teams.js";
import type * as videoActions from "../videoActions.js";
import type * as videos from "../videos.js";
import type * as workspace from "../workspace.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  comments: typeof comments;
  http: typeof http;
  mux: typeof mux;
  muxActions: typeof muxActions;
  projects: typeof projects;
  s3: typeof s3;
  shareLinks: typeof shareLinks;
  teams: typeof teams;
  videoActions: typeof videoActions;
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

export declare const components: {};
