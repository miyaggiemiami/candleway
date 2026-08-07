---
name: Serverless deployment
description: Durable constraints for deploying the Express API alongside the Vite SPA on function-based hosts.
---

Serverless providers import the Express app as a request handler; `app.listen()`
must be guarded so it only runs for the long-running local/Replit process.

**Why:** Vercel and Netlify initialize function modules on demand and provide
their own HTTP listener. Starting another listener during import causes a
deployment/runtime failure.

**How to apply:** Keep provider-specific entrypoints thin: export the Express
app directly for Vercel's Node runtime and use an adapter such as
`serverless-http` for Netlify events.

Avoid evaluating `fileURLToPath(import.meta.url)` in serverless bundles. Netlify
can bundle the module without a usable `import.meta.url`; static SPA files
should be served by Netlify/Vercel, while filesystem-based static serving is
only needed by the long-running local/Replit server.