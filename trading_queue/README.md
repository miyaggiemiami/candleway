# Apexium AI Chart Analyzer — isolated trading queue

This folder adds a standalone Flask queue service and a Windows MetaTrader 5
bridge. It does not replace or edit the existing React app, Express API,
Supabase Auth, or application trade tables. Queue data uses new
`apx_trade_licenses` and `apx_trade_queue` tables.

## Components

- `vision_prompt.py`: strict JSON schema and OpenAI vision system prompt. It is
  only the prompt/schema; no OpenAI API call or credential is configured.
- `api.py` / `routes.py`: license-authenticated queue endpoints, server-side
  signal validation, atomic PostgreSQL row claiming with a lease, and result
  acknowledgements.
- `schema.sql`: additive PostgreSQL DDL for the two isolated tables.
- `provision_license.py`: creates a random high-entropy license and stores only
  its SHA-256 hash; the plaintext key is printed once.
- `bridge/mt5_bridge.py`: Windows poller, MT5 order sender, and break-even
  position monitor.

## Run the service locally

Install the service dependencies from `trading_queue/requirements.txt`, then
run from the repository root:

```sh
python -m trading_queue.dev
```

The development command isolates the service on SQLite at
`trading_queue/data/queue-dev.sqlite3` and creates only that local database's
tables. Production must use PostgreSQL and must apply `schema.sql` through the
database's approved migration process; production schema creation is never run
automatically at service startup.

Set `TRADING_QUEUE_DATABASE_URL` to a PostgreSQL connection string, or allow the
service to use the existing `DATABASE_URL`. In production also set
`APP_ENV=production`. A production SQLite configuration is rejected.

Production process command:

```sh
APP_ENV=production gunicorn --workers 2 --threads 4 --bind 0.0.0.0:${PORT:-8000} 'trading_queue.api:create_app()'
```

The current Replit deployment still starts the existing Node app. This Flask
service is separately runnable and must be deployed as its own service before a
desktop client can reach it. The Replit development workflow added for it uses
local SQLite and is not a production deployment.

## Database setup and license provisioning

1. Apply `schema.sql` to the intended PostgreSQL database using its approved
   migration process. The SQL only adds new queue tables; it does not alter the
   existing `trades` table.
2. Configure `TRADING_QUEUE_DATABASE_URL` and `APP_ENV=production`.
3. Run `python -m trading_queue.provision_license` from an operator shell.
4. Copy the one-time printed key into the customer's local
   `trading_queue/bridge/.env` as `TRADING_QUEUE_LICENSE_KEY`. Do not put it in
   source control or a URL/query string. To revoke a license, set the matching
   `apx_trade_licenses.active` value to `false`.

## API

All client endpoints require `X-License-Key`. Keys are never accepted in query
parameters or request bodies.

- `POST /api/execute-trade`: accepts a directional vision result plus a
  server-side `volume`. The service rejects neutral signals, malformed prices,
  wrong-side stops/targets, and TP1 below 1.5:1 reward/risk from the worst edge
  of the entry zone. Optional `Idempotency-Key` prevents duplicate queue rows.
- `GET /api/get-pending-trade`: atomically claims the oldest available item and
  returns a short-lived `claim_token`. Expired leases can be retried a bounded
  number of times.
- `POST /api/trades/<id>/result`: the bridge acknowledges `filled`, `rejected`,
  `partial`, `submitted`, or `failed` with the claim token. A stale claim
  cannot update a newer attempt. `submitted` means the broker accepted the
  request but did not immediately confirm a fill.
- `GET /health`: database connectivity check; returns no credentials.

The queue stores a hash of each license key, not its plaintext. TLS/HTTPS is
required for public service URLs. Add rate limiting and operational monitoring
at the deployment edge before offering this to customers. Browser-based callers
must set `TRADING_QUEUE_ALLOWED_ORIGINS` to a comma-separated exact origin
allowlist; the service does not reflect arbitrary CORS origins. Do not expose a
customer license key in browser JavaScript; a web-app integration needs a
server-side authenticated proxy or an equivalent protected native-client flow.

## Windows MT5 bridge

1. Install Python 3.10+ and MetaTrader 5 on the Windows machine; sign into a
   broker demo account first.
2. Install packages listed in `trading_queue/bridge/requirements.txt`.
3. Copy `bridge/.env.example` to `bridge/.env`, set the HTTPS service URL and
   issued license key, and keep `MT5_ALLOW_LIVE_TRADING=false`.
4. Run `python trading_queue/bridge/mt5_bridge.py`.

The bridge refuses real accounts unless the operator explicitly sets
`MT5_ALLOW_LIVE_TRADING=true`. It also checks that the live quote is within the
approved entry zone, validates broker volume/stops, submits SL and TP1 with the
market order, tags orders with magic `234000`, and moves qualifying positions'
stops to entry plus/minus two pips after 30 pips of profit. Pip definitions vary
by broker and instrument; configure `MT5_PIP_SIZE_OVERRIDES` where needed.

To build on Windows with a visible console and diagnostic logs:

```sh
pyinstaller --onefile trading_queue/bridge/mt5_bridge.py
```

Build the executable on Windows, not on the Replit/Linux host. The client's
`.env` must be distributed separately and must not be embedded in the EXE.

## Verification

Run the isolated API tests with:

```sh
python -m unittest trading_queue.tests.test_api
```

These tests use an in-memory SQLite database and do not connect to or modify the
application's configured PostgreSQL database. Live MT5 execution is not part of
the test suite; validate only with a broker demo account before considering any
real-account use. AI chart outputs can be wrong and must not be treated as
guaranteed trading results.