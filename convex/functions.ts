/* eslint-disable no-restricted-imports */
import {
  internalMutation as rawInternalMutation,
  mutation as rawMutation,
} from "./_generated/server";
/* eslint-enable no-restricted-imports */
import type { DataModel } from "./_generated/dataModel";
import { Triggers } from "convex-helpers/server/triggers";
import { customCtx, customMutation } from "convex-helpers/server/customFunctions";
import { syncFolderEntry, syncVideoEntry } from "./searchEntries";

// Every mutation must be built from the wrappers below (enforced by ESLint) so
// these triggers see all writes to `projects` and `videos`.
export const triggers = new Triggers<DataModel>();

triggers.register("projects", async (ctx, change) => {
  if (change.operation === "update" && change.oldDoc.name === change.newDoc.name) return;
  await syncFolderEntry(ctx, change.id, change.newDoc);
});

triggers.register("videos", async (ctx, change) => {
  // Upload progress and Mux polling patch videos constantly; skip those writes.
  if (
    change.operation === "update" &&
    change.oldDoc.title === change.newDoc.title &&
    change.oldDoc.projectId === change.newDoc.projectId &&
    change.oldDoc.supersededByVideoId === change.newDoc.supersededByVideoId
  ) {
    return;
  }
  await syncVideoEntry(ctx, change.id, change.newDoc);
});

export const mutation = customMutation(rawMutation, customCtx(triggers.wrapDB));
export const internalMutation = customMutation(rawInternalMutation, customCtx(triggers.wrapDB));
