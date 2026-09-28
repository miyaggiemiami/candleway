# Apexium — AI Trading Dashboard

React/Vite frontend with an Express API for authentication, chart analysis,
trade journaling, risk settings, Stripe billing, and MetaTrader connectivity.

## Local development

```bash
npm install
cp .env.example .env
npm run dev
```

The development workflow serves the Express API and Vite frontend together.
Run `npm run build && npm start` to test the production server locally.

## Deploy to Netlify or Vercel

The frontend is a standard Vite SPA. Use `npm run build` with `dist` as the
publish/output directory. The included SPA fallback files keep direct visits
to `/login`, `/signup`, `/dashboard`, and other client routes from returning a
host 404.

The Express API is a separate long-running Node service. Deploy it with
`npm run build` and `npm start`, then set `VITE_API_URL` on the frontend to the
public API origin. In local development, leave `VITE_API_URL` empty and the
Express/Vite proxy serves `/api` on the same origin.

## Hosted environment variables

Set these in the provider's environment-variable settings (not in Git):

- `DATABASE_URL` — PostgreSQL connection string used by the API
- `VITE_SUPABASE_URL` — Supabase project URL used by the browser
- `VITE_SUPABASE_PUBLISHABLE_KEY` — Supabase publishable/anon key used by the browser
- `SUPABASE_URL` — Supabase project URL used by the API
- `SUPABASE_PUBLISHABLE_KEY` — Supabase publishable/anon key used by the API
- `VITE_API_URL` — public API origin when frontend and API are deployed separately
- `GOOGLE_API_KEY` — Gemini chart analysis and chat
- `APP_URL` — optional deployed HTTPS origin used by payment redirects

Optional features use `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`,
`SENDGRID_API_KEY`, `FROM_EMAIL`, `METAAPI_TOKEN`, and `METAAPI_ACCOUNT_ID`.
See `.env.example` for the complete list.

The MetaTrader 5 desktop bridge remains a separate local/remote service.
Configure the bridge URL in the Live tab after deploying.

### Supabase Auth setup

Supabase Auth is the only account system. Configure the Site URL to the
frontend origin and add each frontend origin to Redirect URLs, including:

```text
https://your-frontend-domain.com/**
http://localhost:5000/**
```

The API verifies Supabase access tokens. Existing profile, analysis, trade,
risk, and MetaTrader rows remain in PostgreSQL and are keyed by the Supabase
Auth user UUID. Run `npm run db:push` against the API database after this
migration so legacy foreign keys to the old `users` table are removed.
