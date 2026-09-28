# CandleWay — AI Chart Analyzer

## Overview
CandleWay is an AI-powered trading automation platform. Users upload chart screenshots, get institutional-grade AI analysis (trend, bias, entry, stop loss, take profit), manage risk settings, log paper/live trades, and connect MetaTrader accounts via MetaApi.

## Architecture

- **Frontend**: React + Vite + TypeScript, Tailwind CSS + shadcn/ui components
- **Backend**: Express.js server (`server/`) with TypeScript via `tsx`
- **Database**: PostgreSQL via Drizzle ORM for application data
- **AI**: Google Gemini (gemini-2.0-flash / gemini-2.5-flash) for chart analysis and AI chat
- **Auth**: Supabase Auth sessions with persistent browser storage and Supabase access-token verification in the API

## Running the App

```bash
npm run dev        # Starts Express server (port 5000) + Vite dev server (port 5173) concurrently
npm run db:push    # Push schema changes to PostgreSQL
npm run build      # Build for production
```

The Express server proxies all non-API requests to Vite in development. The webview runs on port 5000.

## Project Structure

```
server/
  index.ts          # Express app entry point + AI endpoints (/api/analyze-chart, /api/ai-chat)
  auth.ts           # Supabase access-token verification middleware
  db/
    index.ts        # Drizzle + pg Pool setup
    schema.ts       # All table definitions
  routes/            # Protected application-data APIs
    profiles.ts     # /api/profiles — user profile CRUD
    analyses.ts     # /api/analyses — chart analysis history
    trades.ts       # /api/trades — trade log
    riskSettings.ts # /api/risk-settings — per-user risk config
    riskConsent.ts  # /api/risk-consent — risk disclaimer consent
    metatrader.ts   # /api/metatrader — MT settings + live trade execution
    stripe.ts       # /api/check-subscription, /api/create-checkout, /api/customer-portal

src/
  lib/api.ts        # All frontend API calls (fetch wrappers to /api/*)
  hooks/useAuth.tsx # AuthContext — user, profile, signIn/Out, subscription
  hooks/useRiskSettings.ts
  hooks/useMetaTrader.ts
  hooks/useTrades.ts
  pages/            # Index, Auth, History, Pricing, Settings, ResetPassword
  components/       # UI components
  integrations/supabase/client.ts  # Supabase Auth browser client
```

## Environment Variables / Secrets

| Key | Purpose | Required |
|-----|---------|----------|
| `DATABASE_URL` | PostgreSQL used by the API | Yes |
| `GOOGLE_API_KEY` | Gemini AI for chart analysis + chat | Yes |
| `VITE_SUPABASE_URL` | Supabase project URL used by the browser | Yes |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase browser key | Yes |
| `SUPABASE_URL` | Supabase project URL used by the API | Yes |
| `SUPABASE_PUBLISHABLE_KEY` | Supabase API key | Yes |
| `VITE_API_URL` | Public API origin for a separate frontend deployment | Hosted frontend only |
| `STRIPE_SECRET_KEY` | Stripe payments/subscriptions | Optional |
| `STRIPE_PRICE_ID` | Stripe subscription price ID | Optional |

## Key Features

1. **AI Chart Analysis** — Upload a chart image → Gemini analyzes trend, entry, SL/TP, patterns, market structure
2. **AI Chat** — Streaming chat assistant for trading guidance
3. **Trade Journal** — Log paper and live trades, track P&L
4. **Risk Management** — Per-user risk settings, kill switch, confidence threshold, circuit breaker
5. **MetaTrader Integration** — Connect MT4/MT5 via MetaApi to execute real trades
6. **Subscriptions** — Stripe-based premium tier (unlimited analyses, advanced AI)

## Authentication Flow
- Users sign up and sign in through Supabase Auth
- Supabase persists and refreshes the browser session
- Protected APIs verify Supabase access tokens with `supabase.auth.getUser`
- Password reset uses Supabase recovery links and `updateUser`

## Notes
- Supabase Auth owns accounts; PostgreSQL stores application profile and feature data
- Edge functions (analyze-chart, ai-chat, check-subscription, etc.) are now Express routes
