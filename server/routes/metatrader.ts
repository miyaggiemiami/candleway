import { Router } from "express";
import { db } from "../db/index";
import { metatraderSettings, trades } from "../db/schema";
import { requireAuth, AuthenticatedRequest } from "../auth";
import { eq } from "drizzle-orm";

const router = Router();

router.use(requireAuth);

router.get("/settings", async (req: AuthenticatedRequest, res) => {
  try {
    const [settings] = await db.select().from(metatraderSettings).where(eq(metatraderSettings.user_id, req.userId!)).limit(1);
    return res.json(settings || null);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/settings", async (req: AuthenticatedRequest, res) => {
  try {
    const { account_id, api_token, server_region, platform } = req.body;
    const [existing] = await db.select().from(metatraderSettings).where(eq(metatraderSettings.user_id, req.userId!)).limit(1);

    let settings;
    if (existing) {
      [settings] = await db.update(metatraderSettings)
        .set({ account_id, api_token, server_region, platform, updated_at: new Date() })
        .where(eq(metatraderSettings.user_id, req.userId!))
        .returning();
    } else {
      [settings] = await db.insert(metatraderSettings)
        .values({ user_id: req.userId!, account_id, api_token, server_region, platform })
        .returning();
    }

    return res.json(settings);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/trade", async (req: AuthenticatedRequest, res) => {
  try {
    const { action, symbol, volume, stopLoss, takeProfit, direction, tradeId } = req.body;

    const [mtSettings] = await db.select().from(metatraderSettings).where(eq(metatraderSettings.user_id, req.userId!)).limit(1);

    const metaapiToken = mtSettings?.api_token || process.env.METAAPI_TOKEN;
    const metaapiAccountId = mtSettings?.account_id || process.env.METAAPI_ACCOUNT_ID;
    const serverRegion = mtSettings?.server_region || "new-york";

    if (!metaapiToken || !metaapiAccountId) {
      return res.json({ error: "MetaTrader not configured. Add your credentials in Settings." });
    }

    const baseUrl = `https://mt-client-api-v1.${serverRegion}.agiliumtrade.ai/users/current/accounts/${metaapiAccountId}`;

    if (action === "get-account-info") {
      const r = await fetch(`${baseUrl}/account-information`, {
        headers: { "auth-token": metaapiToken, Accept: "application/json" },
      });
      const data = await r.json();
      if (!r.ok) return res.json({ error: data.message || "Failed to get account info" });
      return res.json({ success: true, account: data });
    }

    if (action === "execute-trade") {
      const normalizedSymbol = symbol.replace("/", "");
      const actionType = direction === "BUY" ? "ORDER_TYPE_BUY" : "ORDER_TYPE_SELL";
      const tradePayload: Record<string, unknown> = { actionType, symbol: normalizedSymbol, volume: volume || 0.01 };
      if (stopLoss && stopLoss > 0) tradePayload.stopLoss = stopLoss;
      if (takeProfit && takeProfit > 0) tradePayload.takeProfit = takeProfit;

      const r = await fetch(`${baseUrl}/trade`, {
        method: "POST",
        headers: { "auth-token": metaapiToken, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(tradePayload),
      });
      const data = await r.json();

      if (!r.ok || (data.stringCode && data.stringCode !== "TRADE_RETCODE_DONE")) {
        return res.status(400).json({ error: data.message || data.stringCode || "Trade execution failed", details: data });
      }

      const slPrice = stopLoss || 0;
      const tpPrice = takeProfit || 0;
      const entryPrice = data.orderId ? 0 : (slPrice + tpPrice) / 2;

      await db.insert(trades).values({
        user_id: req.userId!,
        pair: symbol,
        direction,
        entry_price: String(entryPrice),
        stop_loss: String(slPrice),
        take_profit: String(tpPrice),
        lot_size: String(volume || 0.01),
        status: "open",
        outcome: "pending",
        pnl: "0",
        execution_mode: "live",
        notes: `MetaApi order: ${data.orderId || "market"}`,
      });

      return res.json({ success: true, orderId: data.orderId, stringCode: data.stringCode, message: data.message });
    }

    if (action === "get-positions") {
      const r = await fetch(`${baseUrl}/positions`, {
        headers: { "auth-token": metaapiToken, Accept: "application/json" },
      });
      const data = await r.json();
      return res.json({ success: true, positions: data });
    }

    if (action === "close-position") {
      const r = await fetch(`${baseUrl}/trade`, {
        method: "POST",
        headers: { "auth-token": metaapiToken, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ actionType: "POSITION_CLOSE_ID", positionId: tradeId }),
      });
      const data = await r.json();
      return res.json({ success: true, ...data });
    }

    return res.status(400).json({ error: "Invalid action" });
  } catch (err: any) {
    console.error("MetaTrader route error:", err);
    return res.status(500).json({ error: err.message || "Internal error" });
  }
});

export default router;
