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

## Deploy the SPA

Use `npm run build` with `dist` as the publish directory. Netlify uses the
committed `public/_redirects` file and Vercel uses the minimal `vercel.json`
rewrite so browser refreshes on client routes continue to load the SPA.

The Express API remains a separate Node process. Set `VITE_API_BASE_URL` to its
HTTPS origin when deploying the frontend separately; leave it blank when the
frontend and API are served together.

## Deploy to another Node hosting provider

Use a provider that supports a long-running Node.js process. Configure the
build command as `npm run build` and the start command as `npm start`. The
server listens on the provider's `PORT` environment variable and serves both
the built frontend and `/api/*`.

## Hosted environment variables

Set these in the provider's environment-variable settings (not in Git):

- `DATABASE_URL` — PostgreSQL connection string
- `SUPABASE_URL` and `SUPABASE_ANON_KEY` — server-side Supabase Auth API access
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` — browser Supabase Auth access
- `GOOGLE_API_KEY` — Gemini chart analysis and chat

Optional features use `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`,
`SENDGRID_API_KEY`, `FROM_EMAIL`, `METAAPI_TOKEN`, and `METAAPI_ACCOUNT_ID`.
See `.env.example` for the complete list.

The MetaTrader 5 desktop bridge remains a separate local/remote service;
serverless and hosted web deployments cannot run the Windows MT5 terminal
themselves. Configure the bridge URL in the Live tab after deploying.
