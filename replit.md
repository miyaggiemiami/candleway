# CandleWay — AI Chart Analyzer

## Overview
CandleWay is an AI-powered trading automation platform. Users upload chart screenshots, get institutional-grade AI analysis (trend, bias, entry, stop loss, take profit), manage risk settings, log paper/live trades, and connect MetaTrader accounts via MetaApi.

## Architecture

- **Frontend**: React + Vite + TypeScript, Tailwind CSS + shadcn/ui components
- **Backend**: Express.js server (`server/`) with TypeScript via `tsx`
- **Database**: Replit PostgreSQL via Drizzle ORM
- **AI**: Google Gemini (gemini-2.0-flash / gemini-2.5-flash) for chart analysis and AI chat
- **Auth**: Custom JWT auth (bcrypt password hashing, 30-day tokens stored in localStorage)

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
  auth.ts           # JWT sign/verify, bcrypt, requireAuth middleware
  db/
    index.ts        # Drizzle + pg Pool setup
    schema.ts       # All table definitions
  routes/
    auth.ts         # /api/auth/* — signup, signin, me, forgot/reset password
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
  integrations/supabase/client.ts  # Stub — Supabase removed, replaced by Express API
```

## Environment Variables / Secrets

| Key | Purpose | Required |
|-----|---------|----------|
| `DATABASE_URL` | Replit PostgreSQL (auto-set) | Yes |
| `GOOGLE_API_KEY` | Gemini AI for chart analysis + chat | Yes |
| `JWT_SECRET` | JWT token signing | Yes (set in .replit userenv) |
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
- Users sign up/in via `/api/auth/signup` and `/api/auth/signin`
- JWT token stored in `localStorage` as `cw_token`
- All protected API routes use `requireAuth` middleware
- Password reset via email link (SendGrid optional; logs link to console in dev)

## Notes
- Supabase has been fully removed — all data uses Replit PostgreSQL via Drizzle
- Edge functions (analyze-chart, ai-chat, check-subscription, etc.) are now Express routes
- The Supabase `client.ts` file is kept as a stub to avoid import errors
