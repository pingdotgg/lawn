import { Migrations } from "@convex-dev/migrations";
import { components, internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { internalMutation } from "./functions";
import { syncFolderEntry, syncVideoEntry } from "./searchEntries";

export const migrations = new Migrations<DataModel>(components.migrations, { internalMutation });

// Index folders and videos written before the search triggers existed.
export const indexFoldersForSearch = migrations.define({
  table: "projects",
  migrateOne: async (ctx, project) => {
    await syncFolderEntry(ctx, project._id, project);
  },
});

export const indexVideosForSearch = migrations.define({
  table: "videos",
  migrateOne: async (ctx, video) => {
    await syncVideoEntry(ctx, video._id, video);
  },
});

// Runs after every deploy (scripts/vercel-build.sh); finished migrations are skipped.
export const runAll = migrations.runner([
  internal.migrations.indexFoldersForSearch,
  internal.migrations.indexVideosForSearch,
]);
