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