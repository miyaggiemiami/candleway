import { Router } from "express";
import { requireAuth, AuthenticatedRequest } from "../auth";
import { userDocument } from "../firestore";

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
    const ref = userDocument(req.userId!, "riskSettings", "default");
    const snapshot = await ref.get();
    if (!snapshot.exists) await ref.set(DEFAULT_SETTINGS);
    return res.json({ user_id: req.userId, ...(snapshot.exists ? snapshot.data() : DEFAULT_SETTINGS) });
  } catch (error) {
    console.error("Get risk settings error:", error);
    return res.status(500).json({ error: "Could not load risk settings" });
  }
});

router.patch("/", async (req: AuthenticatedRequest, res) => {
  try {
    const allowed = [
      "risk_per_trade", "max_trades_per_day", "max_daily_loss", "daily_profit_lock",
      "confidence_threshold", "automation_mode", "circuit_breaker_enabled",
      "news_filter_enabled", "kill_switch_active",
    ];
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const ref = userDocument(req.userId!, "riskSettings", "default");
    await ref.set(updates, { merge: true });
    const snapshot = await ref.get();
    return res.json({ user_id: req.userId, ...snapshot.data() });
  } catch (error) {
    console.error("Update risk settings error:", error);
    return res.status(500).json({ error: "Could not update risk settings" });
  }
});

export default router;
