# CandleWay — AI Chart Analyzer

## Overview
CandleWay is an AI-powered trading automation platform. Users upload chart screenshots, get institutional-grade AI analysis (trend, bias, entry, stop loss, take profit), manage risk settings, log paper/live trades, and connect MetaTrader accounts via MetaApi.

## Architecture

- **Frontend**: React + Vite + TypeScript, Tailwind CSS + shadcn/ui components
- **Backend**: Express.js server (`server/`) with TypeScript via `tsx`
- **Database**: Firebase Cloud Firestore
- **AI**: Google Gemini (gemini-2.0-flash / gemini-2.5-flash) for chart analysis and AI chat
- **Auth**: Firebase Authentication with Firestore profile/feature data

## Running the App

```bash
npm run dev        # Starts Express server (port 5000) + Vite dev server (port 5173) concurrently
npm run build      # Build for production
```

The Express server proxies all non-API requests to Vite in development. The webview runs on port 5000.

## Project Structure

```
server/
  index.ts          # Express app entry point + AI endpoints (/api/analyze-chart, /api/ai-chat)
  auth.ts           # Firebase ID-token verification middleware
  routes/
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
  integrations/firebase/client.ts # Firebase Auth browser client
```

## Environment Variables / Secrets

| Key | Purpose | Required |
|-----|---------|----------|
| `GOOGLE_API_KEY` | Gemini AI for chart analysis + chat | Yes |
| `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID` | Firebase web app config | Yes |
| `FIREBASE_PROJECT_ID`, `FIREBASE_STORAGE_BUCKET` + Firebase Admin credentials | Firestore, Storage, and server-side token verification | Yes |
| `VITE_API_BASE_URL` | HTTPS origin of the Express API when frontend is hosted separately | Optional |
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
- Users sign up/sign in through Firebase Authentication
- Users may sign in immediately and verify their email later
- Protected API routes verify Firebase ID tokens with the Admin SDK
- Firebase UIDs own their Firestore feature/profile records
- Firebase handles verification and password-reset emails

## Notes
- Firebase Authentication, Firestore, and Storage provide auth and app data
- Edge functions (analyze-chart, ai-chat, check-subscription, etc.) are now Express routes
