import { Router } from "express";
import { db } from "../db/index";
import { riskSettings } from "../db/schema";
import { requireAuth, AuthenticatedRequest } from "../auth";
import { eq } from "drizzle-orm";

const router = Router();

router.use(requireAuth);

const DEFAULT_SETTINGS = {
  risk_per_trade: "1.0",
  max_trades_per_day: 5,
  max_daily_loss: "5.0",
  daily_profit_lock: "0",
  confidence_threshold: 70,
  automation_mode: "manual",
  circuit_breaker_enabled: true,
  news_filter_enabled: false,
  kill_switch_active: false,
};

router.get("/", async (req: AuthenticatedRequest, res) => {
  try {
    let [settings] = await db.select().from(riskSettings).where(eq(riskSettings.user_id, req.userId!)).limit(1);
    if (!settings) {
      [settings] = await db.insert(riskSettings).values({ user_id: req.userId!, ...DEFAULT_SETTINGS }).returning();
    }
    return res.json(settings);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.patch("/", async (req: AuthenticatedRequest, res) => {
  try {
    const allowed = ["risk_per_trade", "max_trades_per_day", "max_daily_loss", "daily_profit_lock", "confidence_threshold", "automation_mode", "circuit_breaker_enabled", "news_filter_enabled", "kill_switch_active"];
    const updates: Record<string, any> = { updated_at: new Date() };
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    let [settings] = await db.select().from(riskSettings).where(eq(riskSettings.user_id, req.userId!)).limit(1);
    if (!settings) {
      [settings] = await db.insert(riskSettings).values({ user_id: req.userId!, ...DEFAULT_SETTINGS, ...updates }).returning();
    } else {
      [settings] = await db.update(riskSettings).set(updates).where(eq(riskSettings.user_id, req.userId!)).returning();
    }

    return res.json(settings);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
