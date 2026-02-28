## Agent info

Generally speaking, you should browse the codebase to figure out what is going on.

We have a few "philosophies" I want to make sure we honor throughout development:

### 1. Performance above all else

When in doubt, do the thing that makes the app feel the fastest to use.

This includes things like

- Optimistic updates
- Using the custom data loader patterns and custom link components with prewarm on hover
- Avoiding waterfalls in anything from js to file fetching

### 2. Good defaults

Users should expect things to behave well by default. Less config is best.

### 3. Convenience

We should not compromise on simplicity and good ux. We want to be pleasant to use with as little friction as possible. This means things like:

- All links are "share" links by default
- Getting from homepage to latest video should always be fewer than 4 clicks
- Minimize blocking states to let users get into app asap

### 4. Security

We want to make things convenient, but we don't want to be insecure. Be thoughtful about how things are implemented. Check team status and user status before committing changes. Be VERY thoughtful about endpoints exposed "publicly". Use auth and auth checks where they make sense to.

## Cursor Cloud specific instructions

### Overview

lawn is a video review platform (React 19 + TanStack Router/Start SPA) with a Convex serverless backend. There is no local database or Docker — all backend services are cloud-hosted SaaS.

### Running the app

- **Web only:** `bun run dev:web` — starts Vite on port 5296. This is sufficient for frontend work when not modifying Convex functions.
- **Full dev:** `bun run dev` — runs Vite + `bunx convex dev` concurrently. Convex dev requires authentication (`npx convex login`) and a `CONVEX_DEPLOYMENT` env var or interactive setup.
- The app will not render at all without `VITE_CLERK_PUBLISHABLE_KEY` set (throws at root component level).

### Quality checks

- `bun run lint` — ESLint across `app`, `src`, `convex` dirs (ignores `convex/_generated`).
- `bun run typecheck` — TypeScript `tsc --noEmit` for the main project.
- `bun run typecheck:convex` — separate typecheck for Convex functions.
- There are no automated test suites in this repo currently.

### Key environment variables

All `VITE_*` vars must be available when the Vite dev server starts (they are inlined at transform time). Convex server-side vars (MUX, Railway, Stripe, Clerk JWT) are set on the Convex deployment, not locally.

### Gotchas

- Auth is Google OAuth only (via Clerk) — no email/password login. Testing authenticated flows requires a real Google sign-in through the Desktop pane.
- The `bun run dev` script uses `concurrently` to run both Vite and Convex dev; if you only need the frontend, use `bun run dev:web` to avoid Convex CLI auth issues.
- Package manager is **Bun** (v1.3.6, lockfile: `bun.lock`). Do not use npm/yarn/pnpm.
