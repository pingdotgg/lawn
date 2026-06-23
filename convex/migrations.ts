import { Migrations } from "@convex-dev/migrations";
import { components, internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { normalizeDashboardSortText } from "./dashboardSort";
import { propagateProjectUploadRecency } from "./projectRecency";

const migrations = new Migrations<DataModel>(components.migrations);

export const backfillVideoSortTitles = migrations.define({
  table: "videos",
  migrateOne: (_ctx, video) => {
    const sortTitle = normalizeDashboardSortText(video.title);
    return video.sortTitle === sortTitle ? undefined : { sortTitle };
  },
});

export const backfillProjectUploadRecency = migrations.define({
  table: "videos",
  migrateOne: async (ctx, video) => {
    if (video.supersededByVideoId !== undefined) return;
    await propagateProjectUploadRecency(ctx, video.projectId, video._creationTime);
  },
});

export const runDashboardSortBackfills = migrations.runner([
  internal.migrations.backfillVideoSortTitles,
  internal.migrations.backfillProjectUploadRecency,
]);
