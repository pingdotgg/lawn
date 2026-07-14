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
bun run typecheck
bun run lint
```

## Environment variables

Copy `.env.example` to `.env.local` and fill it in — it lists every variable,
grouped by section (convex, clerk, stripe, mux, storage, autumn, chunkify).

- Root `.env.example` — local dev env (client `VITE_*` vars + secrets that
  `bun run dev` seeds into the local Convex deployment).
- `convex/.env.example` — the Convex **deployment** env vars to set in the
  dashboard or via `npx convex env set` for cloud/prod.

Stripe webhook endpoint (for the Convex Stripe component):

- `https://<your-deployment>.convex.site/stripe/webhook`

Team invite email (optional — shareable invite links always work):

- `RESEND_API_KEY` — Resend API key for sending invite emails from Convex
- `RESEND_FROM_EMAIL` — optional from address; defaults to `Lawn <invites@lawn.video>` (set a verified sender if that domain is not verified in Resend)
- `SITE_URL` or `APP_URL` — public app origin used in invite links (defaults to `https://lawn.video`)
