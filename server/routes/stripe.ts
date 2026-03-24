import { Router } from "express";
import { db } from "../db/index";
import { profiles } from "../db/schema";
import { requireAuth, AuthenticatedRequest } from "../auth";
import { eq } from "drizzle-orm";

const router = Router();

router.use(requireAuth);

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  const Stripe = require("stripe");
  return new Stripe(key, { apiVersion: "2025-08-27.basil" });
}

router.post("/check-subscription", async (req: AuthenticatedRequest, res) => {
  try {
    const stripe = getStripe();
    const [profile] = await db.select().from(profiles).where(eq(profiles.user_id, req.userId!)).limit(1);
    if (!profile) return res.json({ subscribed: false });

    const email = req.userEmail!;
    const customers = await stripe.customers.list({ email, limit: 1 });
    if (customers.data.length === 0) {
      await db.update(profiles).set({ is_premium: false }).where(eq(profiles.user_id, req.userId!));
      return res.json({ subscribed: false });
    }

    const customerId = customers.data[0].id;
    const subscriptions = await stripe.subscriptions.list({ customer: customerId, status: "active", limit: 1 });
    const hasActiveSub = subscriptions.data.length > 0;
    let subscriptionEnd = null;

    if (hasActiveSub) {
      subscriptionEnd = new Date(subscriptions.data[0].current_period_end * 1000).toISOString();
      await db.update(profiles).set({ is_premium: true, subscription_tier: "premium" }).where(eq(profiles.user_id, req.userId!));
    } else {
      await db.update(profiles).set({ is_premium: false, subscription_tier: "free" }).where(eq(profiles.user_id, req.userId!));
    }

    return res.json({ subscribed: hasActiveSub, subscription_end: subscriptionEnd });
  } catch (err: any) {
    console.error("check-subscription error:", err);
    return res.status(500).json({ error: err.message });
  }
});

router.post("/create-checkout", async (req: AuthenticatedRequest, res) => {
  try {
    const stripe = getStripe();
    const email = req.userEmail!;
    const customers = await stripe.customers.list({ email, limit: 1 });
    let customerId = customers.data.length > 0 ? customers.data[0].id : undefined;

    const origin = req.headers.origin || `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}` || "http://localhost:5000";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : email,
      line_items: [{ price: process.env.STRIPE_PRICE_ID || "price_1ShUXxL3nNsJOqbulVzAIF72", quantity: 1 }],
      mode: "subscription",
      success_url: `${origin}/pricing?success=true`,
      cancel_url: `${origin}/pricing?canceled=true`,
    });

    return res.json({ url: session.url });
  } catch (err: any) {
    console.error("create-checkout error:", err);
    return res.status(500).json({ error: err.message });
  }
});

router.post("/customer-portal", async (req: AuthenticatedRequest, res) => {
  try {
    const stripe = getStripe();
    const email = req.userEmail!;
    const customers = await stripe.customers.list({ email, limit: 1 });
    if (customers.data.length === 0) throw new Error("No Stripe customer found for this user");

    const origin = req.headers.origin || `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}` || "http://localhost:5000";
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customers.data[0].id,
      return_url: `${origin}/pricing`,
    });

    return res.json({ url: portalSession.url });
  } catch (err: any) {
    console.error("customer-portal error:", err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
