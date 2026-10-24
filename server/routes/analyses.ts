import { Router } from "express";
import { requireAuth, AuthenticatedRequest } from "../auth";
import { storeAnalysisImage, userCollection } from "../firestore";

const router = Router();
router.use(requireAuth);

router.get("/", async (req: AuthenticatedRequest, res) => {
  try {
    const snapshot = await userCollection(req.userId!, "analyses").orderBy("created_at", "desc").get();
    return res.json(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  } catch (error) {
    console.error("List analyses error:", error);
    return res.status(500).json({ error: "Could not load analyses" });
  }
});

router.post("/", async (req: AuthenticatedRequest, res) => {
  try {
    const {
      pair, timeframe, style, image_url, trend, bias, probability, risk_score,
      support_levels, resistance_levels, market_structure, detected_patterns,
      supply_demand_zones, possible_outcomes, stop_loss, take_profit, reasoning, disclaimer,
    } = req.body;
    const storedImageUrl = await storeAnalysisImage(req.userId!, image_url);
    const record = {
      user_id: req.userId,
      pair, timeframe, style, image_url: storedImageUrl || image_url || null, trend, bias,
      probability: Number(probability),
      risk_score: Number(risk_score),
      support_levels: support_levels || [],
      resistance_levels: resistance_levels || [],
      market_structure,
      detected_patterns: detected_patterns || [],
      supply_demand_zones: supply_demand_zones || [],
      possible_outcomes: possible_outcomes || [],
      stop_loss, take_profit, reasoning, disclaimer,
      created_at: new Date().toISOString(),
    };
    const ref = await userCollection(req.userId!, "analyses").add(record);
    return res.json({ id: ref.id, ...record });
  } catch (error) {
    console.error("Insert analysis error:", error);
    return res.status(500).json({ error: "Could not save analysis" });
  }
});

router.delete("/:id", async (req: AuthenticatedRequest, res) => {
  try {
    const ref = userCollection(req.userId!, "analyses").doc(String(req.params.id));
    const snapshot = await ref.get();
    if (!snapshot.exists) return res.status(404).json({ error: "Analysis not found" });
    await ref.delete();
    return res.json({ success: true });
  } catch (error) {
    console.error("Delete analysis error:", error);
    return res.status(500).json({ error: "Could not delete analysis" });
  }
});

export default router;
