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

## Deploy to Vercel

Import the repository into Vercel. The committed `vercel.json` uses
`npm run build`, publishes `dist`, and routes `/api/*` to the Vercel function
in `api/[...path].ts`. Vercel will detect the function automatically.

## Deploy to another Node hosting provider

Use a provider that supports a long-running Node.js process. Configure the
build command as `npm run build` and the start command as `npm start`. The
server listens on the provider's `PORT` environment variable and serves both
the built frontend and `/api/*`.

## Hosted environment variables

Set these in the provider's environment-variable settings (not in Git):

- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — long random signing secret
- `GOOGLE_API_KEY` — Gemini chart analysis and chat
- `APP_URL` — deployed HTTPS origin, for example `https://app.example.com`

Optional features use `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`,
`SENDGRID_API_KEY`, `FROM_EMAIL`, `METAAPI_TOKEN`, and `METAAPI_ACCOUNT_ID`.
See `.env.example` for the complete list.

The MetaTrader 5 desktop bridge remains a separate local/remote service;
serverless and hosted web deployments cannot run the Windows MT5 terminal
themselves. Configure the bridge URL in the Live tab after deploying.
