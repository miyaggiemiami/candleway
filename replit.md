# CandleWay - AI Trading Automation

## Overview
CandleWay is an AI-powered trading chart analysis platform that lets users upload chart screenshots, get institutional-grade AI analysis, manage trades, and connect to MetaTrader for live execution.

## Architecture

### Frontend
- React + TypeScript + Vite (port 5173 in dev)
- Tailwind CSS + shadcn/ui components
- React Router for navigation
- TanStack Query for data fetching
- JWT authentication stored in localStorage

### Backend
- Express.js server (port 5000)
- Routes under `server/routes/`
- Drizzle ORM with Replit's PostgreSQL database
- Google Gemini AI for chart analysis and chat
- JWT-based auth (bcryptjs + jsonwebtoken)

### Key Routes
- `POST /api/auth/signup` - Register
- `POST /api/auth/signin` - Login
- `POST /api/auth/forgot-password` - Password reset email
- `POST /api/auth/reset-password` - Apply reset token
- `GET/PATCH /api/profiles` - User profile
- `GET/POST /api/analyses` - Chart analysis history
- `GET/POST/PATCH /api/trades` - Paper trades
- `GET/PATCH /api/risk-settings` - Risk configuration
- `GET/POST /api/risk-consent` - Risk consent
- `GET/POST /api/metatrader/settings` - MT credentials
- `POST /api/metatrader/trade` - MT trade execution
- `POST /api/analyze-chart` - AI chart analysis (Gemini)
- `POST /api/ai-chat` - AI chat assistant (SSE streaming)
- `POST /api/check-subscription` - Stripe subscription status
- `POST /api/create-checkout` - Stripe checkout session
- `POST /api/customer-portal` - Stripe billing portal

## Database Schema
All tables in `server/db/schema.ts`:
- `users` - Auth credentials (email + bcrypt hash)
- `profiles` - User profile, premium status, daily usage
- `analyses` - Chart analysis history
- `trades` - Paper/live trade journal
- `risk_settings` - Per-user risk configuration
- `risk_consent` - Risk disclaimer consent
- `metatrader_settings` - MetaApi credentials per user
- `password_resets` - Token-based password reset

## Required Environment Variables / Secrets
- `DATABASE_URL` - Auto-set by Replit PostgreSQL
- `JWT_SECRET` - Set automatically during migration
- `GOOGLE_API_KEY` - Google Gemini API key (for AI analysis)
- `STRIPE_SECRET_KEY` - Optional: Stripe secret key (for subscriptions)
- `STRIPE_PRICE_ID` - Optional: Stripe price ID for premium plan
- `SENDGRID_API_KEY` - Optional: For password reset emails
- `FROM_EMAIL` - Optional: Sender email for password resets

## Development
```bash
npm run dev        # Start both Express server and Vite
npm run db:push    # Push schema changes to database
```

## Pages
- `/` - Dashboard (chart upload, analysis, trades)
- `/auth` - Login / Sign up
- `/pricing` - Subscription plans
- `/history` - Analysis history
- `/settings` - MetaTrader & user settings
- `/reset-password` - Password reset (token in URL query param)
