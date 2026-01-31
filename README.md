# RoyCuts

RoyCuts is a booking and scheduling platform for a barbershop-style business, with a Next.js admin/client web app, a mobile app, and a Supabase backend.

## Repo structure

- `frontend/` Next.js web app (admin + client)
- `mobile/` React Native app
- `supabase/` Edge Functions + database migrations (authoritative DDL)
- `database/schema.sql` Human-readable snapshot of the current schema
- `shared/` Shared types used across apps

## Getting started (web)

1) Install dependencies

```bash
cd frontend
npm install
```

2) Configure env

Copy `frontend/.env.local.example` to `frontend/.env.local` and fill in values.

3) Run

```bash
npm run dev
```

Open `http://localhost:3000`.

## Database and migrations

- Migrations live in `supabase/migrations` and are the source of truth.
- `database/schema.sql` mirrors the current schema for quick reference.
- Apply migrations via Supabase CLI or MCP automation (preferred for production).

## Stripe

The app uses Stripe for card payments and webhooks:

- Webhook endpoint: `/api/webhooks/stripe`
- Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in `frontend/.env.local`.

## Vercel Analytics and Speed Insights

The web app includes Vercel Web Analytics and Speed Insights instrumentation in `frontend/app/layout.tsx`.

To enable data collection:

- In your Vercel project dashboard, enable **Web Analytics** and redeploy.
- Enable **Speed Insights** and redeploy.
- Ensure the `@vercel/analytics` and `@vercel/speed-insights` packages are installed (already in `frontend/package.json`).

## Admin access

Set `OWNER_USER_ID` in `frontend/.env.local` to lock admin API access to the owner user.

## Mobile app

From `mobile/`:

```bash
npm install
npm run start
```

Configure any Supabase keys in `mobile/` as required by the app.
