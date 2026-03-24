import { Router } from "express";
import { db } from "../db/index";
import { riskConsent } from "../db/schema";
import { requireAuth, AuthenticatedRequest } from "../auth";
import { eq } from "drizzle-orm";

const router = Router();

router.use(requireAuth);

router.get("/", async (req: AuthenticatedRequest, res) => {
  try {
    const [consent] = await db.select().from(riskConsent).where(eq(riskConsent.user_id, req.userId!)).limit(1);
    return res.json({ hasConsented: !!consent });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req: AuthenticatedRequest, res) => {
  try {
    const { consent_text } = req.body;
    await db
      .insert(riskConsent)
      .values({ user_id: req.userId!, consent_text })
      .onConflictDoUpdate({ target: riskConsent.user_id, set: { consent_text, consented_at: new Date() } });

    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
