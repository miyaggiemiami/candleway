import { Router } from "express";
import { db } from "../db/index";
import { analyses } from "../db/schema";
import { requireAuth, AuthenticatedRequest } from "../auth";
import { eq, desc } from "drizzle-orm";

const router = Router();

router.use(requireAuth);

router.get("/", async (req: AuthenticatedRequest, res) => {
  try {
    const result = await db
      .select()
      .from(analyses)
      .where(eq(analyses.user_id, req.userId!))
      .orderBy(desc(analyses.created_at));
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req: AuthenticatedRequest, res) => {
  try {
    const {
      pair, timeframe, style, image_url, trend, bias, probability, risk_score,
      support_levels, resistance_levels, market_structure, detected_patterns,
      supply_demand_zones, possible_outcomes, stop_loss, take_profit, reasoning, disclaimer,
    } = req.body;

    const [record] = await db.insert(analyses).values({
      user_id: req.userId!,
      pair, timeframe, style, image_url, trend, bias,
      probability: Number(probability),
      risk_score: Number(risk_score),
      support_levels: support_levels || [],
      resistance_levels: resistance_levels || [],
      market_structure,
      detected_patterns: detected_patterns || [],
      supply_demand_zones: supply_demand_zones || [],
      possible_outcomes: possible_outcomes || [],
      stop_loss, take_profit, reasoning, disclaimer,
    }).returning();

    return res.json(record);
  } catch (err: any) {
    console.error("Insert analysis error:", err);
    return res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req: AuthenticatedRequest, res) => {
  try {
    await db.delete(analyses).where(eq(analyses.id, req.params.id));
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
