# React Router SSR Migration — Completion Report

## Status

Completed in code on **February 3, 2026**.

This repo now runs as a **single React Router Framework Mode app with SSR** and homepage pre-rendering, with Next runtime files removed.

---

## Phase 0 — Scope and guardrails

- [x] Migration executed in one dedicated runtime direction (no hybrid Next + RR runtime).
- [x] Parity target preserved for key routes, auth, Convex integration, invite/share flows.
- [ ] Deployment cutover date/runtime sign-off is still an operational step.

---

## Phase 1 — Scaffold React Router Framework app

- [x] Added framework-mode app root (`app/root.tsx`, `app/routes.ts`).
- [x] Enabled SSR in `react-router.config.ts`.
- [x] Added pre-render for `/` in `react-router.config.ts`.
- [x] Ported global styles to `app/app.css` and root document shell.

---

## Phase 2 — Route migration (feature parity)

Migrated routes:

- [x] `/` -> `app/routes/home.tsx`
- [x] `/mono` -> `app/routes/mono.tsx`
- [x] `/sign-in/*` -> `app/routes/auth/sign-in.tsx`
- [x] `/sign-up/*` -> `app/routes/auth/sign-up.tsx`
- [x] `/dashboard` -> `app/routes/dashboard/index.tsx`
- [x] `/dashboard/:teamSlug` -> `app/routes/dashboard/team.tsx`
- [x] `/dashboard/:teamSlug/settings` -> `app/routes/dashboard/settings.tsx`
- [x] `/dashboard/:teamSlug/:projectId` -> `app/routes/dashboard/project.tsx`
- [x] `/dashboard/:teamSlug/:projectId/:videoId` -> `app/routes/dashboard/video.tsx`
- [x] `/invite/:token` -> `app/routes/invite.tsx`
- [x] `/share/:token` -> `app/routes/share.tsx`

Also completed:

- [x] Recreated nested auth + dashboard layouts with `<Outlet />`.
- [x] Kept canonical path/context logic via `workspace.resolveContext` and shared route helpers.

---

## Phase 3 — Auth migration (Clerk on RR)

- [x] Replaced Next Clerk usage with `@clerk/react-router`.
- [x] Added Clerk middleware + root auth loader in `app/root.tsx`.
- [x] Enabled required middleware flag: `future.v8_middleware`.
- [x] Added dashboard protection via route loader (`getAuth` + redirect to sign-in).
- [x] Kept public access boundaries for `/`, `/sign-in`, `/sign-up`, `/invite/:token`, `/share/:token`.

---

## Phase 4 — Convex integration migration

- [x] Convex backend kept unchanged (`convex/*`).
- [x] Updated provider wiring to framework-agnostic RR root usage.
- [x] Kept `ConvexProviderWithClerk` pattern with RR Clerk auth hook.
- [x] Updated route imports to use `@convex/*` alias where needed.

---

## Phase 5 — API/webhook/runtime cleanup

- [x] Removed Next API webhook proxy route (`src/app/api/webhooks/stripe/route.ts`).
- [x] Removed Next middleware (`src/middleware.ts`).
- [x] Removed Next App Router tree (`src/app/**`).
- [x] Removed Next runtime config (`next.config.ts`, `next-env.d.ts`).
- [x] Updated runtime scripts/tooling to React Router + Vite in `package.json`.

---

## Phase 6 — Test, perf, and SEO validation

Automated checks completed:

- [x] `bun run typecheck`
- [x] `bun run lint`
- [x] `bun run build` (includes SSR build + prerender for `/`)

Manual checks still recommended before production cutover:

- [ ] End-to-end auth flow validation (sign-in/sign-up/sign-out).
- [ ] Dashboard/project/video CRUD regression walk.
- [ ] Invite/share flow regression walk.
- [ ] Upload/playback/comment regression walk.
- [ ] TTFB/LCP checks in staging.

---

## Phase 7 — Cutover and rollback

Not executed in this code-only migration (ops/deploy step):

- [ ] Deploy RR SSR app to staging.
- [ ] Run smoke tests against staging.
- [ ] Flip production traffic.
- [ ] Keep rollback package (last stable Next build) for one release cycle.

---

## Files added/updated (high signal)

Added:

- `app/root.tsx`
- `app/routes.ts`
- `app/routes/**`
- `app/app.css`
- `react-router.config.ts`
- `vite.config.ts`
- `public/favicon.ico`

Updated:

- `package.json`
- `tsconfig.json`
- `eslint.config.mjs`
- `src/lib/convex.tsx`
- `src/components/teams/CreateTeamDialog.tsx`
- `.gitignore`

Removed Next runtime surface:

- `src/app/**`
- `src/middleware.ts`
- `next.config.ts`
- `next-env.d.ts`

---

## Notes

- Build emits non-blocking Vite sourcemap warnings (`Can't resolve original location of error`) from transformed modules; build still succeeds.
- Env keys expected by RR/Vite setup:
  - `VITE_CONVEX_URL`
  - `VITE_CLERK_PUBLISHABLE_KEY`
