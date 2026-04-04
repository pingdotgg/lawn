# Setup

## Development

Install vite+ first. Then...

Install dependencies:

```bash
vp install
```

Run app + Convex locally:

```bash
vp run dev
```

Run only the web app:

```bash
vp run dev:web
```

## Build / Run

```bash
vp run build
vp run start
```

## Quality checks

```bash
vp run typecheck
vp run lint
```

## Environment variables

- `VITE_CONVEX_URL`
- `VITE_CONVEX_SITE_URL`
- `VITE_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `MUX_TOKEN_ID`
- `MUX_TOKEN_SECRET`
- `MUX_WEBHOOK_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_BASIC_MONTHLY`
- `STRIPE_PRICE_PRO_MONTHLY`
- Convex deployment vars as needed (`CONVEX_DEPLOYMENT`, etc.)

Stripe webhook endpoint (for the Convex Stripe component):

- `https://<your-deployment>.convex.site/stripe/webhook`
