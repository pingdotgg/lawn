# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is this?

Lawn is a video review platform for creative teams. Users upload videos, leave timestamped comments, and manage review workflows within team/project hierarchies.

## Commands

```bash
bun run dev           # Start web app + Convex dev server (don't run this — assume it's running)
bun run typecheck     # TypeScript check (frontend)
bun run typecheck:convex  # TypeScript check (Convex backend)
bun run lint          # ESLint across app/, src/, convex/
```

## Architecture

**Frontend**: TanStack Start (SPA mode) + React 19 + Vite. Routes live in `app/routes/` using TanStack Router file-based routing. The app entry is `app/routes/__root.tsx`. The SPA shell is served from `/mono` with static prerender for `/`.

**Backend**: Convex (realtime database + serverless functions). Functions live in `convex/`. The `@convex-dev/presence` component is installed via `convex/convex.config.ts`.

**Auth**: Clerk via `@clerk/tanstack-react-start`, integrated with Convex through `ConvexProviderWithClerk` in `src/lib/convex.tsx`.

**Video pipeline**: Upload to S3 (Railway Object Storage) -> transcode via Chunkify API -> HLS playback. The flow is: `videoActions.ts` (upload/presigned URLs) -> `chunkify.ts` (job creation) -> `chunkifyActions.ts` (webhook processing) -> `videos.ts` (status mutations). Playback uses `hls.js` with lazy loading and idle-time warmup (`src/lib/hlsPlayback.ts`).

**Storage**: Railway Object Storage (S3-compatible). Config in `convex/s3.ts`. Public URLs built from `RAILWAY_PUBLIC_URL`.

**Styling**: Tailwind CSS v4. Brutalist design language — warm cream backgrounds (#f0f0e8), near-black text (#1a1a1a), forest green accent (#2d5a2d), bold 2px borders, dramatic type scale.

## Key patterns

- **Path aliases**: `@/*` maps to `src/*`, `@convex/*` maps to `convex/*` (see tsconfig.json)
- **Route data**: Each route has a `-*.data.ts` companion file that defines Convex query specs and prewarm functions. Data fetching uses `convex/react` hooks (`useQuery`), not TanStack loaders. Route prewarming uses `convexRouteData.ts` utilities.
- **Auth guards**: `convex/auth.ts` provides `requireTeamAccess`, `requireProjectAccess`, `requireVideoAccess` with role hierarchy (owner > admin > member > viewer).
- **Convex actions** that need Node.js APIs (S3, Chunkify) use the `"use node"` directive.
- **HTTP endpoints**: `convex/http.ts` handles webhooks (Stripe, Chunkify) and health checks.
- **UI components**: shadcn/ui primitives in `src/components/ui/`, custom components alongside.

## Data model

Teams -> Projects -> Videos -> Comments (with thread support via parentId). Share links provide external access with optional passwords and expiration. See `convex/schema.ts` for full schema.

## Video workflow states

Videos have a `workflowStatus` field: `review` | `rework` | `done`. Legacy values are normalized in `convex/videos.ts:normalizeWorkflowStatus()`.
