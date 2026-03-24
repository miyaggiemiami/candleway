import { Router } from "express";
import { db } from "../db/index";
import { profiles } from "../db/schema";
import { requireAuth, AuthenticatedRequest } from "../auth";
import { eq } from "drizzle-orm";

const router = Router();

router.use(requireAuth);

router.get("/", async (req: AuthenticatedRequest, res) => {
  try {
    let [profile] = await db.select().from(profiles).where(eq(profiles.user_id, req.userId!)).limit(1);
    if (!profile) {
      [profile] = await db.insert(profiles).values({ user_id: req.userId! }).returning();
    }

    const lastReset = profile.last_analysis_reset ? new Date(profile.last_analysis_reset) : null;
    const now = new Date();
    const hoursSinceReset = lastReset ? (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60) : 25;

    if (hoursSinceReset >= 24) {
      [profile] = await db
        .update(profiles)
        .set({ daily_analyses_used: 0, last_analysis_reset: now, updated_at: now })
        .where(eq(profiles.user_id, req.userId!))
        .returning();
    }

    return res.json(profile);
  } catch (err: any) {
    console.error("Get profile error:", err);
    return res.status(500).json({ error: err.message });
  }
});

router.patch("/", async (req: AuthenticatedRequest, res) => {
  try {
    const allowed = ["display_name", "username", "trading_style", "preferred_pair", "preferred_timeframe", "daily_analyses_used", "last_analysis_reset"];
    const updates: Record<string, any> = { updated_at: new Date() };
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const [profile] = await db
      .update(profiles)
      .set(updates)
      .where(eq(profiles.user_id, req.userId!))
      .returning();

    return res.json(profile);
  } catch (err: any) {
    console.error("Update profile error:", err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
