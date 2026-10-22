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
`SENDGRID_API_KEY`, and `FROM_EMAIL`. See `.env.example` for the complete list.

## Direct MetaTrader 5 connection (Windows)

The Express server connects to the local MetaTrader 5 terminal through the
official Python package. Run the app server on the same Windows machine as the
installed MT5 terminal, then install the connector dependency:

```powershell
python -m pip install -r requirements-mt5.txt
```

Set `MT5_CREDENTIALS_ENCRYPTION_KEY` to a private 64-character hexadecimal key
before starting the server. Generate one with:

```powershell
python -c "import secrets; print(secrets.token_hex(32))"
```

Keep this key stable and private: changing or losing it makes saved MT5
passwords unreadable. If the Python executable with the installed package is
not on `PATH` as `python`, set `MT5_PYTHON_PATH` to its full path. After
applying `supabase/migrations/20261022133400_add_direct_mt5_credentials.sql`
and restarting the server, enter the account number, trading password, and
exact broker server name in Settings. Passwords are encrypted at rest and are
never returned by the settings API.

This direct connector is intended for a Windows host with the MT5 terminal
installed. A separately hosted frontend or non-Windows/serverless API cannot
run the local terminal.
