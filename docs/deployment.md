# Deployment

## Deploying to Vercel (with Convex)

This repo is configured so Vercel runs:

```bash
bun run build:vercel
```

`build:vercel` runs Convex deployment first, then runs the app build via Convex:

```bash
bunx convex deploy --cmd 'bun run build' --cmd-url-env-var-name VITE_CONVEX_URL
```

Required Vercel environment variable:

- `CONVEX_DEPLOY_KEY` (create a production deploy key in Convex and add it in Vercel project settings)

## Dashboard sorting backfill

The dashboard sorting rollout adds optional normalized video-title keys and
denormalized descendant-upload timestamps. New writes maintain both fields.
The application runtime gates alphabetical sorting while any legacy video is
missing its normalized key, so the existing one-shot `build:vercel` promotion
remains safe. After deployment, dry-run and complete each backfill separately:

```bash
bunx convex run migrations:backfillVideoSortTitles '{"dryRun":true}' --prod
bunx convex run migrations:backfillVideoSortTitles --prod
bunx convex run --component migrations lib:getStatus --prod
bunx convex run dashboardSort:verifyAlphabeticalReady --prod

bunx convex run migrations:backfillProjectUploadRecency '{"dryRun":true}' --prod
bunx convex run migrations:backfillProjectUploadRecency --prod
bunx convex run --component migrations lib:getStatus --prod
```

Do not consider rollout complete until `lib:getStatus` reports each migration
complete and `dashboardSort:verifyAlphabeticalReady` returns `true`. The migration
component is resumable; rerunning a migration continues from its saved cursor.
Keep both fields optional until production backfill status is complete.
