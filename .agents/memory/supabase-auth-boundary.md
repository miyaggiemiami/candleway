---
name: Supabase authentication boundary
description: The application’s account/session source of truth and the relationship between Supabase Auth and application PostgreSQL data.
---

Supabase Auth is the only account system. The browser owns persistent sessions
through the Supabase client, and the API verifies bearer access tokens with
Supabase before accessing application data.

**Why:** The previous custom JWT/bcrypt flow duplicated Supabase concepts,
failed on hosted routing, and tied feature-table foreign keys to a local
`users` table instead of the real authenticated user.

**How to apply:** Keep profiles, analyses, trades, risk, and MetaTrader rows in
application PostgreSQL keyed by the Supabase Auth UUID. Do not add local
password storage, custom auth endpoints, or foreign keys from those tables to a
duplicate local users table.