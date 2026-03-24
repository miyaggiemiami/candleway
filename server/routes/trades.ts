import { Router } from "express";
import { db } from "../db/index";
import { trades } from "../db/schema";
import { requireAuth, AuthenticatedRequest } from "../auth";
import { eq, desc } from "drizzle-orm";

const router = Router();

router.use(requireAuth);

router.get("/", async (req: AuthenticatedRequest, res) => {
  try {
    const result = await db
      .select()
      .from(trades)
      .where(eq(trades.user_id, req.userId!))
      .orderBy(desc(trades.opened_at));
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req: AuthenticatedRequest, res) => {
  try {
    const { pair, direction, entry_price, stop_loss, take_profit, lot_size, execution_mode, risk_reward, confidence, notes, analysis_id } = req.body;

    const [trade] = await db.insert(trades).values({
      user_id: req.userId!,
      pair, direction,
      entry_price: String(entry_price),
      stop_loss: String(stop_loss),
      take_profit: String(take_profit),
      lot_size: String(lot_size || 0.01),
      status: "open",
      outcome: "pending",
      pnl: "0",
      execution_mode: execution_mode || "manual",
      risk_reward: risk_reward ? String(risk_reward) : null,
      confidence: confidence ? Number(confidence) : null,
      notes,
      analysis_id: analysis_id || null,
    }).returning();

    return res.json(trade);
  } catch (err: any) {
    console.error("Insert trade error:", err);
    return res.status(500).json({ error: err.message });
  }
});

router.patch("/:id", async (req: AuthenticatedRequest, res) => {
  try {
    const allowed = ["status", "outcome", "pnl", "closed_at", "notes"];
    const updates: Record<string, any> = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const [trade] = await db
      .update(trades)
      .set(updates)
      .where(eq(trades.id, req.params.id))
      .returning();

    return res.json(trade);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
