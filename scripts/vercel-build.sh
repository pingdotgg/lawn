#!/usr/bin/env bash
# Deploy Convex, build the app, then start any pending data migrations.
# Previews run them via --preview-run; production runs them right after deploy.
# Migrations run in the background and finished ones are skipped, so this is cheap.
set -euo pipefail

bunx convex deploy \
  --cmd 'bun run build' \
  --cmd-url-env-var-name VITE_CONVEX_URL \
  --preview-run migrations:runAll

if [ "${VERCEL_ENV:-}" = "production" ]; then
  bunx convex run migrations:runAll
fi
