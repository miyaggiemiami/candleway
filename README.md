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

- `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, and `VITE_FIREBASE_APP_ID` — Firebase web app settings
- `FIREBASE_PROJECT_ID`, `FIREBASE_STORAGE_BUCKET`, and one server credential method: `FIREBASE_SERVICE_ACCOUNT_JSON`, `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY`, or Google Application Default Credentials
- `GOOGLE_API_KEY` — Gemini chart analysis and chat

## Firebase Authentication setup

1. Create a Firebase project and register a Web app in Project settings.
2. Enable **Authentication → Sign-in method → Email/Password**.
3. Add localhost and the deployed website domain under **Authentication → Settings → Authorized domains**.
4. Put the web app settings in the `VITE_FIREBASE_*` variables. These browser settings are public, but the Admin SDK credentials are private and must only be configured as server-side secrets.
5. Configure Firebase Admin on the API server using a service-account JSON secret, `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY` + `FIREBASE_PROJECT_ID`, or Google Application Default Credentials.
6. Create a Firestore database in **Build → Firestore Database** and a Storage bucket in **Build → Storage**. Set the same Firebase project ID in the frontend and server configuration, and the bucket name in `FIREBASE_STORAGE_BUCKET`. Firebase's built-in email action handles verification and password-reset emails; no SMTP key is needed.
7. Deploy the included Firestore and Storage rules (`firebase deploy --only firestore:rules,storage`) or paste them into the Firebase Console. They deny direct browser access; app data is accessed through the authenticated server API. Firebase's default email action handler redirects back to the app routes.

Users may sign in immediately and verify later from the in-app reminder. The API independently verifies Firebase ID tokens with the Admin SDK. User profiles, trading history, risk settings, consent, and MetaTrader settings are stored in Firestore; chart images are stored in Firebase Storage. Existing accounts and old database data are not automatically migrated. Existing users must create Firebase accounts, and old records need a separate migration if they should be retained.

Optional features use `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, and MetaTrader
settings. See `.env.example` for the complete list.

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
configuring Firebase and restarting the server, enter the account number, trading password, and
exact broker server name in Settings. Passwords are encrypted at rest and are
never returned by the settings API.

This direct connector is intended for a Windows host with the MT5 terminal
installed. A separately hosted frontend or non-Windows/serverless API cannot
run the local terminal.
