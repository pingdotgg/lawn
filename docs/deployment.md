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

## Canonical identity migration

The first deployment containing `ownerIdentity` / `userIdentity` fields uses
dual reads and writes so it remains compatible with existing rows. After that
deployment, dry-run and start the resumable migration:

```bash
bunx convex run migrations:backfillTeamOwnerIdentity '{"dryRun":true}' --prod
bunx convex run migrations:run '{"fn":"migrations:backfillTeamOwnerIdentity","next":["migrations:backfillTeamMemberIdentity","migrations:backfillTeamInviteIdentity","migrations:backfillVideoUploaderIdentity","migrations:backfillCommentIdentity","migrations:backfillShareLinkCreatorIdentity"]}' --prod
bunx convex run --component migrations lib:getStatus --watch --prod
```

Only remove the legacy `*ClerkId` fields and indexes in a later deployment,
after every migration reports `done`.
