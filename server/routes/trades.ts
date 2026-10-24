import { Router } from "express";
import { requireAuth, AuthenticatedRequest } from "../auth";
import { userCollection } from "../firestore";

const router = Router();
router.use(requireAuth);

router.get("/", async (req: AuthenticatedRequest, res) => {
  try {
    const snapshot = await userCollection(req.userId!, "trades").orderBy("opened_at", "desc").get();
    return res.json(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  } catch (error) {
    console.error("List trades error:", error);
    return res.status(500).json({ error: "Could not load trades" });
  }
});

router.post("/", async (req: AuthenticatedRequest, res) => {
  try {
    const {
      pair, direction, entry_price, stop_loss, take_profit, lot_size,
      execution_mode, risk_reward, confidence, notes, analysis_id,
    } = req.body;
    let safeAnalysisId: string | null = analysis_id || null;
    if (safeAnalysisId) {
      const analysis = await userCollection(req.userId!, "analyses").doc(String(safeAnalysisId)).get();
      if (!analysis.exists) safeAnalysisId = null;
    }

    const trade = {
      user_id: req.userId,
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
      notes: notes || null,
      analysis_id: safeAnalysisId,
      opened_at: new Date().toISOString(),
    };
    const ref = await userCollection(req.userId!, "trades").add(trade);
    return res.json({ id: ref.id, ...trade });
  } catch (error) {
    console.error("Insert trade error:", error);
    return res.status(500).json({ error: "Could not save trade" });
  }
});

router.patch("/:id", async (req: AuthenticatedRequest, res) => {
  try {
    const allowed = ["status", "outcome", "pnl", "closed_at", "notes"];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    const ref = userCollection(req.userId!, "trades").doc(String(req.params.id));
    const snapshot = await ref.get();
    if (!snapshot.exists) return res.status(404).json({ error: "Trade not found" });
    await ref.update(updates);
    return res.json({ id: ref.id, ...snapshot.data(), ...updates });
  } catch (error) {
    console.error("Update trade error:", error);
    return res.status(500).json({ error: "Could not update trade" });
  }
});

export default router;
