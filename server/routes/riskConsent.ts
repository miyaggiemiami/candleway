import { Router } from "express";
import { requireAuth, AuthenticatedRequest } from "../auth";
import { userDocument } from "../firestore";

const router = Router();
router.use(requireAuth);

router.get("/", async (req: AuthenticatedRequest, res) => {
  try {
    const snapshot = await userDocument(req.userId!, "riskConsent", "default").get();
    return res.json({ hasConsented: snapshot.exists });
  } catch (error) {
    console.error("Get risk consent error:", error);
    return res.status(500).json({ error: "Could not load risk consent" });
  }
});

router.post("/", async (req: AuthenticatedRequest, res) => {
  try {
    const consentText = req.body?.consent_text;
    if (typeof consentText !== "string" || !consentText.trim()) {
      return res.status(400).json({ error: "Consent text is required" });
    }
    await userDocument(req.userId!, "riskConsent", "default").set({
      consent_text: consentText,
      consented_at: new Date().toISOString(),
    });
    return res.json({ success: true });
  } catch (error) {
    console.error("Save risk consent error:", error);
    return res.status(500).json({ error: "Could not save risk consent" });
  }
});

export default router;
