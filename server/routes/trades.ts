import { Router } from "express";
import { db } from "../db/index";
import { trades, analyses } from "../db/schema";
import { requireAuth, AuthenticatedRequest } from "../auth";
import { and, eq, desc } from "drizzle-orm";

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

    // Validate analysis_id FK - if it doesn't exist in the analyses table, use null
    let safeAnalysisId: string | null = analysis_id || null;
    if (safeAnalysisId) {
      try {
        const [found] = await db.select({ id: analyses.id }).from(analyses).where(eq(analyses.id, safeAnalysisId)).limit(1);
        if (!found) safeAnalysisId = null;
      } catch {
        safeAnalysisId = null;
      }
    }

    const [trade] = await db.insert(trades).values({
      user_id: req.userId!,
      pair, direction,
      entry_price: String(entry_price || 0),
      stop_loss: String(stop_loss || 0),
      take_profit: String(take_profit || 0),
      lot_size: String(lot_size || 0.01),
      status: "open",
      outcome: "pending",
      pnl: "0",
      execution_mode: execution_mode || "manual",
      risk_reward: risk_reward ? String(risk_reward) : null,
      confidence: confidence ? Number(confidence) : null,
      notes,
      analysis_id: safeAnalysisId,
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
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    const id = String(req.params.id);
    const [trade] = await db
      .update(trades)
      .set(updates)
      .where(and(eq(trades.id, id), eq(trades.user_id, req.userId!)))
      .returning();

    if (!trade) return res.status(404).json({ error: "Trade not found" });
    return res.json(trade);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
