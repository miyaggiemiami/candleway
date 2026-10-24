import { Router } from "express";
import { requireAuth, AuthenticatedRequest } from "../auth";
import { userDocument } from "../firestore";

const router = Router();
router.use(requireAuth);

const DEFAULT_PROFILE = {
  display_name: null,
  username: null,
  avatar_url: null,
  trading_style: null,
  preferred_pair: null,
  preferred_timeframe: null,
  is_premium: false,
  subscription_tier: "free",
  daily_analyses_used: 0,
  last_analysis_reset: new Date().toISOString(),
};

router.get("/", async (req: AuthenticatedRequest, res) => {
  try {
    const profileRef = userDocument(req.userId!, "profiles", "default");
    const snapshot = await profileRef.get();
    if (!snapshot.exists) {
      await profileRef.set(DEFAULT_PROFILE);
      return res.json({ id: "default", user_id: req.userId, ...DEFAULT_PROFILE });
    }

    const profile = snapshot.data()!;
    const lastReset = profile.last_analysis_reset ? new Date(profile.last_analysis_reset) : null;
    if (!lastReset || Date.now() - lastReset.getTime() >= 24 * 60 * 60 * 1000) {
      profile.daily_analyses_used = 0;
      profile.last_analysis_reset = new Date().toISOString();
      profile.updated_at = new Date().toISOString();
      await profileRef.set(profile, { merge: true });
    }
    return res.json({ id: snapshot.id, user_id: req.userId, ...profile });
  } catch (error) {
    console.error("Get profile error:", error);
    return res.status(500).json({ error: "Could not load profile" });
  }
});

router.patch("/", async (req: AuthenticatedRequest, res) => {
  try {
    const allowed = [
      "display_name", "username", "trading_style", "preferred_pair", "preferred_timeframe",
      "daily_analyses_used", "last_analysis_reset",
    ];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }
    updates.updated_at = new Date().toISOString();

    const profileRef = userDocument(req.userId!, "profiles", "default");
    await profileRef.set(updates, { merge: true });
    const snapshot = await profileRef.get();
    return res.json({ id: "default", user_id: req.userId, ...snapshot.data() });
  } catch (error) {
    console.error("Update profile error:", error);
    return res.status(500).json({ error: "Could not update profile" });
  }
});

export default router;
