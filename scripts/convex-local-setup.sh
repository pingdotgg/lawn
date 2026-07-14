#!/usr/bin/env bash
#
# Provision this git worktree's OWN local (anonymous) Convex deployment so the
# dev stack runs fully offline and isolated per worktree. The deployment's data
# lives in ./.convex/local (git-ignored), so every Conductor workspace gets its
# own backend + database instead of fighting over one shared cloud dev backend.
#
# Idempotent: skips fast once provisioned (delete .convex/.seeded to redo).
#
# What it does:
#   1. Configures an anonymous local deployment, escaping any cloud
#      CONVEX_DEPLOYMENT=dev:... value that .env.local was copied in with.
#   2. Seeds the deployment's environment variables (a fresh local backend
#      starts with NONE), which is required for `convex dev` to push functions:
#        - Stripe / Clerk / Chunkify / Autumn secrets found in .env.local
#        - CLERK_JWT_ISSUER_DOMAIN, derived from VITE_CLERK_PUBLISHABLE_KEY
#          (push-blocking, and not stored in .env.local)
#
# Secrets that live ONLY in the Convex cloud dashboard (not in .env.local) are
# read at runtime, so the push still succeeds without them. To use the matching
# feature locally, add them to .env.convex.local (git-ignored, auto-seeded):
#   - RAILWAY_* : S3-compatible storage (video file uploads)
#   - MUX_*     : Mux video encoding / playback
#
set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

MARKER=".convex/.seeded"
if [ -f "$MARKER" ] && [ "${CONVEX_LOCAL_FORCE_SEED:-}" != "1" ]; then
  echo "convex-local-setup: already provisioned (delete $MARKER or set CONVEX_LOCAL_FORCE_SEED=1 to redo)."
  exit 0
fi

if [ ! -f .env.local ]; then
  echo "convex-local-setup: no .env.local found; skipping local Convex provisioning."
  exit 0
fi

# Pick ports. In Conductor each worktree gets a 10-port range from CONDUCTOR_PORT;
# use +1/+2 for the local backend (the Vite dev server takes CONDUCTOR_PORT).
cloud_port="${CONVEX_LOCAL_CLOUD_PORT:-}"
site_port="${CONVEX_LOCAL_SITE_PORT:-}"
if [ -z "$cloud_port" ] && [ -n "${CONDUCTOR_PORT:-}" ]; then
  cloud_port=$((CONDUCTOR_PORT + 1))
  site_port=$((CONDUCTOR_PORT + 2))
fi
port_flags=()
if [ -n "$cloud_port" ]; then
  port_flags=(--local-cloud-port "$cloud_port" --local-site-port "${site_port:-$((cloud_port + 1))}")
fi

echo "convex-local-setup: configuring anonymous local deployment..."
# CONVEX_DEPLOYMENT= escapes any cloud "dev:" value so we configure LOCAL.
# The first push fails until env is seeded (step 2); that is expected.
if [ "${#port_flags[@]}" -gt 0 ]; then
  CONVEX_AGENT_MODE=anonymous CONVEX_DEPLOYMENT='' \
    bunx convex dev --once "${port_flags[@]}" --tail-logs disable >/dev/null 2>&1 || true
else
  CONVEX_AGENT_MODE=anonymous CONVEX_DEPLOYMENT='' \
    bunx convex dev --once --tail-logs disable >/dev/null 2>&1 || true
fi

echo "convex-local-setup: seeding deployment environment variables..."
seed="$(mktemp)"
trap 'rm -f "$seed"' EXIT
# Backend runtime secrets only; drop client (VITE_) and selection (CONVEX_) vars.
grep -hE '^(STRIPE_|CLERK_|CHUNKIFY_|AUTUMN_|RAILWAY_|MUX_|RESEND_|SITE_URL=|APP_URL=)' .env.local .env.convex.local 2>/dev/null \
  | grep -vE '^VITE_' > "$seed" || true
# Derive CLERK_JWT_ISSUER_DOMAIN from the Clerk publishable key when not provided.
# A Clerk pk_(test|live)_ key base64-encodes "<frontend-api-host>$"; the JWT
# issuer is https://<that host>.
issuer_domain=$(grep -E '^CLERK_JWT_ISSUER_DOMAIN=' "$seed" | tail -1 | cut -d= -f2- | tr -d "\"'[:space:]")
if [ -z "${issuer_domain:-}" ]; then
  pk=$(grep -hE '^VITE_CLERK_PUBLISHABLE_KEY=' .env.local 2>/dev/null | head -1 | cut -d= -f2- | tr -d "\"'")
  if [ -n "${pk:-}" ]; then
    host=$(printf '%s' "$pk" | sed -E 's/^pk_(test|live)_//' | { base64 -d 2>/dev/null || base64 -D 2>/dev/null; } | tr -d '$')
    if [ -n "$host" ]; then
      issuer_domain="https://$host"
      echo "CLERK_JWT_ISSUER_DOMAIN=$issuer_domain" >> "$seed"
    fi
  fi
fi

if [ -z "${issuer_domain:-}" ]; then
  echo "convex-local-setup: ERROR - missing CLERK_JWT_ISSUER_DOMAIN. Set it explicitly or provide a valid VITE_CLERK_PUBLISHABLE_KEY in .env.local." >&2
  exit 1
fi

if [ -s "$seed" ]; then
  # Reads the now-configured anonymous deployment from .env.local (do NOT blank
  # CONVEX_DEPLOYMENT here -- `convex env set` requires a configured deployment).
  if CONVEX_AGENT_MODE=anonymous bunx convex env set --force --from-file "$seed" >/dev/null 2>&1; then
    echo "convex-local-setup: seeded $(grep -c '=' "$seed" | tr -d ' ') variable(s)."
  else
    echo "convex-local-setup: ERROR - env seeding failed. Run \`bunx convex dev\` once to configure, then re-run this script." >&2
    exit 1
  fi
fi

mkdir -p .convex && touch "$MARKER"
echo "convex-local-setup: done. This worktree has its own local Convex deployment."
