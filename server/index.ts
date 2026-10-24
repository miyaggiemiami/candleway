import express from "express";
import cors from "cors";
import { GoogleGenerativeAI } from "@google/generative-ai";
import profilesRouter from "./routes/profiles";
import analysesRouter from "./routes/analyses";
import tradesRouter from "./routes/trades";
import riskSettingsRouter from "./routes/riskSettings";
import riskConsentRouter from "./routes/riskConsent";
import metatraderRouter from "./routes/metatrader";
import stripeRouter from "./routes/stripe";
import { requireAuth, AuthenticatedRequest } from "./auth";
import { userDocument } from "./firestore";

const FREE_DAILY_ANALYSIS_LIMIT = 10;

const app = express();
app.set("trust proxy", 1);
app.use(cors());
app.use(express.json({ limit: "20mb" }));

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || process.env.GOOGLEAPI || process.env.GOOGLE_APIKEY || "";

function getGemini() {
  if (!GOOGLE_API_KEY) throw new Error("GOOGLE_API_KEY is not configured. Add it in the Secrets tab.");
  return new GoogleGenerativeAI(GOOGLE_API_KEY);
}

const ANALYSIS_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-2.5-flash-lite"];
const CHAT_MODELS    = ["gemini-2.0-flash-lite", "gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.5-flash-lite"];

function parseRetryAfter(err: any): number {
  try {
    const msg: string = err?.message || "";
    const m = msg.match(/retry in ([\d.]+)/i);
    if (m) return Math.ceil(parseFloat(m[1]));
    const jm = msg.match(/"retryDelay"\s*:\s*"(\d+)s"/);
    if (jm) return parseInt(jm[1], 10);
  } catch {}
  return 60;
}

function isModelUnavailable(err: any): boolean {
  const msg = (err?.message || "").toLowerCase();
  return msg.includes("not found") || msg.includes("not supported") || msg.includes("404") || msg.includes("deprecated");
}

function isRateLimit(err: any): boolean {
  const msg = err?.message || "";
  return msg.includes("429") || msg.includes("503") || msg.includes("Service Unavailable") || msg.includes("high demand") || msg.includes("overloaded");
}

// ── Data routes ───────────────────────────────────────────────────────────────
app.use("/api/profiles", profilesRouter);
app.use("/api/analyses", analysesRouter);
app.use("/api/trades", tradesRouter);
app.use("/api/risk-settings", riskSettingsRouter);
app.use("/api/risk-consent", riskConsentRouter);
app.use("/api/metatrader", metatraderRouter);

// ── Backward-compatible MetaTrader endpoint ───────────────────────────────────
app.post("/api/execute-metatrader-trade", (req, res) => {
  req.url = "/trade";
  (metatraderRouter as any).handle(req, res, () => {
    res.status(404).json({ error: "Not found" });
  });
});

// ── AI: Chart Analysis ────────────────────────────────────────────────────────
// Requires auth and enforces the daily free-tier limit server-side. The client
// also tracks/display this, but that check alone can be bypassed by calling
// this endpoint directly, which would otherwise let anyone burn the Gemini quota.
app.post("/api/analyze-chart", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { imageBase64, pair, timeframe, style } = req.body;
    if (!imageBase64) return res.json({ error: "No image provided" });

    const profileRef = userDocument(req.userId!, "profiles", "default");
    const profileSnapshot = await profileRef.get();
    const profile = profileSnapshot.exists
      ? profileSnapshot.data()!
      : { is_premium: false, daily_analyses_used: 0, last_analysis_reset: new Date().toISOString() };
    if (!profileSnapshot.exists) await profileRef.set(profile);

    const lastReset = profile.last_analysis_reset ? new Date(profile.last_analysis_reset) : null;
    const hoursSinceReset = lastReset ? (Date.now() - lastReset.getTime()) / (1000 * 60 * 60) : 25;
    const usedToday = hoursSinceReset >= 24 ? 0 : profile.daily_analyses_used || 0;
    if (hoursSinceReset >= 24) {
      profile.daily_analyses_used = 0;
      profile.last_analysis_reset = new Date().toISOString();
      await profileRef.set({
        daily_analyses_used: 0,
        last_analysis_reset: profile.last_analysis_reset,
      }, { merge: true });
    }

    if (!profile.is_premium && usedToday >= FREE_DAILY_ANALYSIS_LIMIT) {
      return res.status(429).json({
        error: "daily_limit_reached",
        message: `You've used all ${FREE_DAILY_ANALYSIS_LIMIT} free analyses today. Upgrade to Premium for unlimited analyses.`,
      });
    }

    const genAI = getGemini();

    const systemPrompt = `You are an institutional trading analyst with deep expertise in technical analysis, price action, and market microstructure.

Analyze the provided chart for: ${pair} on ${timeframe} timeframe with ${style} trading style.

ANALYSIS FRAMEWORK:
1. Market Structure: Identify HH/HL (bullish), LH/LL (bearish), or consolidation
2. Key Levels: Precise support/resistance from price action, not round numbers
3. Candlestick Patterns: Pin bars, engulfing, doji, hammer, morning/evening star, three soldiers/crows
4. Chart Patterns: Double top/bottom, head & shoulders, triangles, wedges, flags, channels
5. Trend Analysis: Direction, strength, momentum shifts
6. Supply/Demand Zones: Institutional order blocks and liquidity pools
7. Breakout/Fakeout Assessment: Volume context and structural validity

DECISION RULES:
- direction: BUY only if multiple confluences align bullish. SELL only if bearish. WAIT if unclear.
- confidence: 0-100. Only 80+ for strong multi-factor confluence.
- risk_level: Low (clear trend + pattern), Medium (some confluence), High (unclear)
- NEVER guarantee profit. If analysis is unclear direction must be WAIT.
- entry, stop_loss, and take_profit MUST always be a specific numeric price level visible or derivable from the chart. NEVER use "N/A", "awaiting confirmation", or any placeholder — always estimate based on nearest key level or recent swing high/low.

Return ONLY valid JSON (no markdown, no extra text):
{
  "direction": "BUY" | "SELL" | "WAIT",
  "trend": "Uptrend" | "Downtrend" | "Sideways",
  "bias": "Buy" | "Sell" | "No Trade",
  "confidence": <number 0-100>,
  "probability": <number 0-100>,
  "risk_level": "Low" | "Medium" | "High",
  "riskScore": <number 1-10>,
  "entry": "<price level>",
  "stop_loss": "<price level>",
  "take_profit": "<price level>",
  "risk_reward": "<ratio like 1:2.5>",
  "supportLevels": ["level1", "level2", "level3"],
  "resistanceLevels": ["level1", "level2", "level3"],
  "marketStructure": "<description>",
  "detectedPatterns": ["pattern1", "pattern2"],
  "supplyDemandZones": ["zone1", "zone2"],
  "possibleOutcomes": [
    {"scenario": "Bullish", "probability": 60, "description": "..."},
    {"scenario": "Bearish", "probability": 30, "description": "..."},
    {"scenario": "Sideways", "probability": 10, "description": "..."}
  ],
  "reasoning": "<detailed explanation>"
}`;

    let imagePart: any;
    if (imageBase64.startsWith("data:")) {
      const [header, data] = imageBase64.split(",");
      const mimeType = header.match(/data:([^;]+)/)?.[1] || "image/jpeg";
      imagePart = { inlineData: { data, mimeType } };
    } else {
      imagePart = { inlineData: { data: imageBase64, mimeType: "image/jpeg" } };
    }

    let lastErr: any = null;
    for (const modelName of ANALYSIS_MODELS) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent([
          systemPrompt,
          `Analyze this ${pair} chart on ${timeframe} for ${style} trading. Return JSON only.`,
          imagePart,
        ]);

        const content = result.response.text();
        if (!content) return res.json({ error: "No analysis generated" });

        let jsonStr = content.trim();
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) jsonStr = jsonMatch[1].trim();
        const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (objectMatch) jsonStr = objectMatch[0];

        let analysis: any;
        try {
          analysis = JSON.parse(jsonStr);
        } catch {
          console.error("Failed to parse AI response:", content);
          return res.json({ error: "Failed to parse analysis results" });
        }

        let possibleOutcomes = analysis.possibleOutcomes || [];
        if (possibleOutcomes.length > 0 && typeof possibleOutcomes[0] === "object") {
          possibleOutcomes = possibleOutcomes.map((o: any) => `${o.scenario} (${o.probability}%): ${o.description}`);
        }

        return res.json({
          ...analysis,
          possibleOutcomes,
          pair,
          timeframe,
          style,
          stopLoss: analysis.stop_loss || analysis.stopLoss || "-",
          takeProfit: analysis.take_profit || analysis.takeProfit || "-",
          probability: analysis.confidence || analysis.probability || 50,
          riskScore: analysis.riskScore || (analysis.risk_level === "Low" ? 3 : analysis.risk_level === "Medium" ? 5 : 8),
          disclaimer: "Not financial advice. Probability-based analysis only. AI is not guaranteed. Always manage your risk.",
        });
      } catch (err: any) {
        lastErr = err;
        if (isRateLimit(err) || isModelUnavailable(err)) {
          console.warn(`Model ${modelName} unavailable (${isRateLimit(err) ? "rate-limited" : "not found"}), trying next...`);
          continue;
        }
        throw err;
      }
    }

    const retryAfter = parseRetryAfter(lastErr);
    return res.status(429).json({
      error: "rate_limit",
      retryAfter,
      message: `AI quota reached. Please wait ${retryAfter} seconds and try again.`,
    });
  } catch (error: any) {
    console.error("Error in analyze-chart:", error);
    if (isRateLimit(error)) {
      const retryAfter = parseRetryAfter(error);
      return res.status(429).json({ error: "rate_limit", retryAfter, message: `AI quota reached. Please wait ${retryAfter} seconds and try again.` });
    }
    return res.json({ error: error.message || "An unexpected error occurred" });
  }
});

// ── AI: Chat ──────────────────────────────────────────────────────────────────
app.post("/api/ai-chat", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
  const { messages, userName } = req.body;
  const genAI = getGemini();

  const nameNote = userName ? `The user's name is ${userName}. Use their name naturally and occasionally in your replies — not every message, just when it feels natural.` : "";

  const systemInstruction = `You are Apexium AI, a chill trading assistant. Keep every reply short and to the point — no long paragraphs.

Your tone is friendly and casual, like texting a knowledgeable friend. Not stiff or overly professional.

Never use asterisks (*), bullet points, hashtags, or any markdown formatting. Just plain conversational sentences.

You help with chart analysis results, trading concepts, app features, MetaTrader setup, risk settings, and pricing questions.

Never give specific financial advice or guarantee profits. Briefly remind users that trading involves risk where relevant.

${nameNote}`.trim();

  const history = (messages || []).slice(0, -1).map((m: any) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  const lastMessage = messages?.[messages.length - 1];

  let lastErr: any = null;
  let hadRateLimit = false;
  for (const modelName of CHAT_MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName, systemInstruction });

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const chat = model.startChat({ history });
      const streamResult = await chat.sendMessageStream(lastMessage?.content || "");

      for await (const chunk of streamResult.stream) {
        const text = chunk.text();
        if (text) {
          res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`);
        }
      }
      res.write("data: [DONE]\n\n");
      res.end();
      return;
    } catch (err: any) {
      lastErr = err;
      if (isRateLimit(err)) hadRateLimit = true;
      if ((isRateLimit(err) || isModelUnavailable(err)) && !res.headersSent) {
        console.warn(`Chat model ${modelName} unavailable (${isRateLimit(err) ? "rate-limited" : "not found"}), trying next...`);
        continue;
      }
      break;
    }
  }

  console.error("ai-chat error:", lastErr);
  if (!res.headersSent) {
    if (isRateLimit(lastErr) || hadRateLimit) {
      const retryAfter = parseRetryAfter(lastErr) || 30;
      return res.status(429).json({ error: "rate_limit", retryAfter, message: `AI quota reached. Please wait ${retryAfter} seconds and try again.` });
    }
    return res.status(500).json({ error: lastErr?.message || "Unknown error" });
  }
  res.write(`data: ${JSON.stringify({ error: lastErr?.message })}\n\n`);
  res.end();
  } catch (error: any) {
    console.error("Error in ai-chat:", error);
    if (!res.headersSent) {
      return res.status(500).json({ error: error.message || "An unexpected error occurred" });
    }
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

// ── Fear & Greed proxy ────────────────────────────────────────────────────────
app.get("/api/fear-greed", async (_req, res) => {
  try {
    const r = await fetch("https://api.alternative.me/fng/?limit=1&format=json");
    if (!r.ok) throw new Error(`upstream ${r.status}`);
    const data = await r.json();
    const entry = data?.data?.[0];
    if (!entry) throw new Error("no data");
    res.json({ value: parseInt(entry.value, 10), classification: entry.value_classification, timestamp: entry.timestamp });
  } catch (e: any) {
    res.status(502).json({ error: e.message });
  }
});

// ── Stripe routes (mounted last so they don't intercept open AI endpoints) ────
app.use("/api", stripeRouter);

export default app;
