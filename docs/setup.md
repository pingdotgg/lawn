# Setup

## Development

Install dependencies:

```bash
bun install
```

Run app + Convex locally:

```bash
bun run dev
```

Run only the web app:

```bash
bun run dev:web
```

## Build / Run

```bash
bun run build
bun run start
```

## Quality checks

```bash
bun run check
```

This runs formatting, frontend and Convex typechecks, lint, and both test suites.

## Environment variables

Copy `.env.example` to `.env.local` and fill it in — it lists every variable,
grouped by section (convex, clerk, stripe, mux, storage, autumn, chunkify).

- Root `.env.example` — local dev env (client `VITE_*` vars + secrets that
  `bun run dev` seeds into the local Convex deployment).
- `convex/.env.example` — the Convex **deployment** env vars to set in the
  dashboard or via `npx convex env set` for cloud/prod.

Stripe webhook endpoint (for the Convex Stripe component):

- `https://<your-deployment>.convex.site/stripe/webhook`
