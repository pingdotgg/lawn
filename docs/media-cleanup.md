# External media cleanup

Video/version, whole-stack, recursive-folder, team, and abandoned-upload deletion
all record media cleanup in the same Convex transaction that removes the video or
clears its storage fields. Existing access checks and version renumbering remain
in place; external requests never block the deletion mutation.

- `mediaCleanup` retains exact object keys, multipart IDs, Mux asset IDs, and legacy
  Mux upload IDs. Deleted-video tombstones associate late provider results with
  their former owners. These records intentionally survive successful cleanup.
- The worker claims at most 10 resources per action (five fresh jobs/retries and
  five recurring rechecks), acknowledges each separately,
  and schedules another bounded batch while work is available. A minute cron
  recovers interrupted runs. Leases expire after 15 minutes; failures back off
  from 30 seconds to at most one day. Missing resources count as success;
  permission/configuration failures remain retryable and visible in `lastError`.
- Claims check indexed surviving references. Upload and Mux attachment mutations
  refuse retired resources, closing the gap between checking references and the
  external delete. Shared resources wait until the last reference disappears.
- Existing URL-shaped storage keys are canonicalized in batches of 100 before
  any external cleanup is claimed. New writes maintain the same index. The
  optional schema fields need no separate deploy or manual migration command.
- Known multipart uploads are aborted and checked for remaining parts before the
  object is deleted. Retired object keys are deleted again daily: URL expiry does
  not stop an already-started PUT, and a multipart completion can race an abort.
  Do not prune these records merely because an initial deletion succeeded.
- Mux passthrough includes the video ID and a fixed-size SHA-256 hash of the
  upload key, keeping long legacy keys within Mux’s metadata limit. Callbacks accept only the
  matching processing attempt, or enqueue its abandoned asset. A bounded Mux
  inventory page every five minutes recovers lost create responses/webhooks.
  The existing multipart sweep now advances one provider page every six hours
  and queues abandoned sessions; the worker protects surviving upload IDs.

The queue uses the deployment's existing Railway bucket and Mux environment.
Keep that storage configuration stable while cleanup is outstanding. Inspect
`mediaCleanup.lastError`, `nextAttemptAt`, and `attempts` to diagnose delayed work.
Large provider inventories can take multiple sweep intervals to reconcile.
Resources deleted before this change, without a retained key or tombstone, cannot
be recovered by this queue.

Validation uses `convex-test` with mocked S3/Mux operations, covering nested and
version deletion, shared references (including legacy URLs), partial failures,
lease recovery, duplicate execution, late writes/callbacks, and upload replacement.
Run `bun run check` and `bun run build`. No live provider deletion or deployment is
part of these checks. Provider-specific behavior and production backfill/cron
execution still need observation after deployment. An empty, expiring Convex preview is used for this PR's Vercel checks, with a
branch-specific deployment key. It has no S3/Mux credentials and only a placeholder
Stripe key for module analysis. The shared development backend remains unchanged.
