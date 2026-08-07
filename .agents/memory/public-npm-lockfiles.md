---
name: Public npm lockfiles
description: Constraint for deploying this project through external CI providers such as Netlify and Vercel.
---

`package-lock.json` must resolve every package tarball through a public registry
when the repository is built outside Replit.

**Why:** Replit may rewrite lockfile tarball URLs to its internal package
firewall host, which external build machines cannot resolve and which causes
dependency installation to fail before the app build starts.

**How to apply:** Before external deployment, search lockfiles for
`replit.local` or `package-firewall`; use `https://registry.npmjs.org/` URLs and
keep provider build environments explicitly configured to use the public npm
registry.