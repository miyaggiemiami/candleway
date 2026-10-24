import { Router } from "express";
import { requireAuth, AuthenticatedRequest } from "../auth";
import { getRequestOrigin } from "../requestOrigin";
import { userDocument } from "../firestore";
import Stripe from "stripe";

const router = Router();

router.use(requireAuth);

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  // Pin to the API version the installed `stripe` SDK (20.x) actually ships types for.
  return new Stripe(key, { apiVersion: "2025-08-27.basil" as Stripe.LatestApiVersion });
}

function getPriceId(): string {
  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) throw new Error("STRIPE_PRICE_ID is not configured");
  return priceId;
}

router.post("/check-subscription", async (req: AuthenticatedRequest, res) => {
  try {
    const stripe = getStripe();
    const profileRef = userDocument(req.userId!, "profiles", "default");
    const profileSnapshot = await profileRef.get();
    if (!profileSnapshot.exists) return res.json({ subscribed: false });

    const email = req.userEmail!;
    const customers = await stripe.customers.list({ email, limit: 1 });
    if (customers.data.length === 0) {
      await profileRef.set({ is_premium: false, subscription_tier: "free" }, { merge: true });
      return res.json({ subscribed: false });
    }

    const customerId = customers.data[0].id;
    const subscriptions = await stripe.subscriptions.list({ customer: customerId, status: "active", limit: 1 });
    const hasActiveSub = subscriptions.data.length > 0;
    let subscriptionEnd = null;

    if (hasActiveSub) {
      // Stripe moved the period end onto the subscription item, not the subscription itself.
      const periodEndUnix = subscriptions.data[0].items.data[0]?.current_period_end;
      subscriptionEnd = periodEndUnix ? new Date(periodEndUnix * 1000).toISOString() : null;
      await profileRef.set({ is_premium: true, subscription_tier: "premium" }, { merge: true });
    } else {
      await profileRef.set({ is_premium: false, subscription_tier: "free" }, { merge: true });
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

    const origin = getRequestOrigin(req);

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : email,
      line_items: [{ price: getPriceId(), quantity: 1 }],
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

    const origin = getRequestOrigin(req);
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
