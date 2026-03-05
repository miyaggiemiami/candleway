

## Plan: Reset Daily Analysis Counter for Non-Premium Users

**Goal:** Set `daily_analyses_used` back to 0 for all non-premium users so they regain their 10/10 daily limit.

**Implementation:** Run a single database migration:

```sql
UPDATE profiles 
SET daily_analyses_used = 0, last_analysis_reset = now() 
WHERE is_premium = false;
```

This resets the counter and the reset timestamp so the 24-hour window starts fresh. No code changes needed -- the existing auto-reset logic in `useAuth.tsx` will continue handling future resets automatically.

