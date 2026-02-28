## Cursor Cloud specific instructions

### Convex: local self-hosted backend

This environment uses a **self-hosted Convex backend via Docker** instead of Convex Cloud. No Convex account is needed.

**Starting the backend** (must be done before `bunx convex dev`):

```sh
sudo dockerd &>/tmp/dockerd.log &
sleep 3
sudo docker compose -f /tmp/convex-compose.yml up -d
```

Wait for the health check to pass, then push functions:

```sh
bunx convex dev --once
```

The backend listens on `http://127.0.0.1:3210`, site proxy on `:3211`, dashboard on `:6791`. Config lives in `.env.local` (gitignored) with `CONVEX_SELF_HOSTED_URL` and `CONVEX_SELF_HOSTED_ADMIN_KEY`.

Server-side env vars (Stripe, Clerk, MUX, Railway) are set on the local Convex deployment via `bunx convex env set`. If you get push errors about missing env vars, set them with `bunx convex env set VAR_NAME "$VAR_NAME"`.

### Running the app

- `bun run dev:web` — Vite on port 5296. Use `VITE_CONVEX_URL=http://127.0.0.1:3210` (set in `.env.local`).
- `bun run dev` — runs Vite + `bunx convex dev` concurrently (watches for Convex function changes).
- The app requires `VITE_CLERK_PUBLISHABLE_KEY` to render (throws at root level without it).

### Quality checks

See `docs/setup.md`. Key commands: `bun run lint`, `bun run typecheck`, `bun run typecheck:convex`. No automated test suite exists.

### Package manager

**Bun** v1.3.6 (lockfile: `bun.lock`). Do not use npm/yarn/pnpm.
