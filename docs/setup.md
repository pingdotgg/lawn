# Setup

## Development

Install dependencies:

```bash
npm install
```

Run app + Convex locally:

```bash
npm run dev
```

Run only the web app:

```bash
npm run dev:web
```

## Build / Run

```bash
npm run build
npm run start
```

## Quality checks

```bash
npm run typecheck
npm run lint
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
