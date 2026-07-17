import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "reclaim stale video uploads",
  { hours: 1 },
  internal.videoActions.sweepStaleUploads,
);

crons.interval(
  "abort orphaned multipart uploads",
  { hours: 6 },
  internal.videoActions.sweepOrphanedMultipartUploads,
);

crons.interval(
  "reconcile processing Mux assets",
  { minutes: 1 },
  internal.videoActions.sweepMuxAssetStatuses,
);

crons.interval(
  "sweep expired share access grants",
  { hours: 1 },
  internal.shareAccess.sweepExpiredShareAccessGrants,
);

crons.interval(
  "sweep expired folder share access grants",
  { hours: 1 },
  internal.folderShareAccess.sweepExpiredFolderShareAccessGrants,
);

export default crons;
