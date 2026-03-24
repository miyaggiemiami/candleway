import express from "express";
import cors from "cors";
import { createProxyMiddleware } from "http-proxy-middleware";
import { GoogleGenerativeAI } from "@google/generative-ai";

const app = express();
app.use(cors());
app.use(express.json({ limit: "20mb" }));

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
// Accept either secret name in case user saved it under a different name
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || process.env.GOOGLEAPI || process.env.GOOGLE_APIKEY || "";

function getGemini() {
  if (!GOOGLE_API_KEY) throw new Error("GOOGLE_API_KEY is not configured. Add it in the Secrets tab.");
  return new GoogleGenerativeAI(GOOGLE_API_KEY);
}

// Models tried in order when rate-limited (each has its own quota)
const ANALYSIS_MODELS = ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-2.0-flash-exp"];
const CHAT_MODELS    = ["gemini-2.0-flash-lite", "gemini-2.0-flash", "gemini-2.0-flash-exp"];

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

function isRateLimit(err: any): boolean {
  return (err?.message || "").includes("429");
}

function supabaseFunctionHeaders(authHeader?: string) {
  return {
    Authorization: authHeader || `Bearer ${SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
    apikey: SUPABASE_ANON_KEY,
  };
}

// ── AI: Chart Analysis ────────────────────────────────────────────────────────
app.post("/api/analyze-chart", async (req, res) => {
  try {
    const { imageBase64, pair, timeframe, style } = req.body;
    if (!imageBase64) return res.json({ error: "No image provided" });

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
        if (isRateLimit(err)) {
          console.warn(`Model ${modelName} rate-limited, trying next...`);
          continue;
        }
        throw err;
      }
    }

    // All models exhausted
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
      return res.status(429).json({
        error: "rate_limit",
        retryAfter,
        message: `AI quota reached. Please wait ${retryAfter} seconds and try again.`,
      });
    }
    return res.json({ error: error.message || "An unexpected error occurred" });
  }
});

// ── AI: Chat ──────────────────────────────────────────────────────────────────
app.post("/api/ai-chat", async (req, res) => {
  const { messages } = req.body;
  const genAI = getGemini();

  const systemInstruction = `You are CandleWay AI, a friendly trading assistant. You help users with:
- Understanding chart analysis results (trend, bias, support/resistance, patterns)
- Explaining trading concepts (lot sizing, risk-reward, stop loss, take profit)
- Guiding them through app features (chart upload, analysis, Manual/Assisted/Auto Trade modes)
- MetaTrader connection setup via Settings (MetaApi credentials)
- Risk management settings (confidence threshold, max daily trades, kill switch)
- Subscription and pricing questions

Keep answers concise, practical, and beginner-friendly.
Never give specific financial advice or guarantee profits. Always remind users trading involves risk.
Format responses with markdown when helpful.`;

  const history = (messages || []).slice(0, -1).map((m: any) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  const lastMessage = messages?.[messages.length - 1];

  let lastErr: any = null;
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
      if (isRateLimit(err) && !res.headersSent) {
        console.warn(`Chat model ${modelName} rate-limited, trying next...`);
        continue;
      }
      break;
    }
  }

  // All models exhausted or non-rate-limit error
  console.error("ai-chat error:", lastErr);
  const retryAfter = parseRetryAfter(lastErr);
  if (!res.headersSent) {
    if (isRateLimit(lastErr)) {
      return res.status(429).json({
        error: "rate_limit",
        retryAfter,
        message: `AI quota reached. Please wait ${retryAfter} seconds and try again.`,
      });
    }
    return res.status(500).json({ error: lastErr?.message || "Unknown error" });
  }
  res.write(`data: ${JSON.stringify({ error: lastErr?.message })}\n\n`);
  res.end();
});

// ── Supabase Function Proxies ─────────────────────────────────────────────────
app.post("/api/check-subscription", async (req, res) => {
  const authHeader = req.headers.authorization as string;
  if (!authHeader) return res.status(401).json({ error: "No authorization header" });
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/check-subscription`, {
      method: "POST", headers: supabaseFunctionHeaders(authHeader),
    });
    return res.status(r.status).json(await r.json());
  } catch (e: any) { return res.status(500).json({ error: e.message }); }
});

app.post("/api/create-checkout", async (req, res) => {
  const authHeader = req.headers.authorization as string;
  if (!authHeader) return res.status(401).json({ error: "No authorization header" });
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/create-checkout`, {
      method: "POST", headers: supabaseFunctionHeaders(authHeader),
    });
    return res.status(r.status).json(await r.json());
  } catch (e: any) { return res.status(500).json({ error: e.message }); }
});

app.post("/api/customer-portal", async (req, res) => {
  const authHeader = req.headers.authorization as string;
  if (!authHeader) return res.status(401).json({ error: "No authorization header" });
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/customer-portal`, {
      method: "POST", headers: supabaseFunctionHeaders(authHeader),
    });
    return res.status(r.status).json(await r.json());
  } catch (e: any) { return res.status(500).json({ error: e.message }); }
});

app.post("/api/execute-metatrader-trade", async (req, res) => {
  const authHeader = req.headers.authorization as string;
  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/execute-metatrader-trade`, {
      method: "POST",
      headers: supabaseFunctionHeaders(authHeader),
      body: JSON.stringify(req.body),
    });
    return res.status(r.status).json(await r.json());
  } catch (e: any) { return res.status(500).json({ error: e.message }); }
});

// ── Dev: proxy everything else to Vite ───────────────────────────────────────
const VITE_PORT = parseInt(process.env.VITE_PORT || "5173", 10);
const isDev = process.env.NODE_ENV !== "production";

if (isDev) {
  app.use(
    "/",
    createProxyMiddleware({
      target: `http://localhost:${VITE_PORT}`,
      changeOrigin: true,
      ws: true,
    })
  );
}

const PORT = parseInt(process.env.PORT || "5000", 10);
app.listen(PORT, "0.0.0.0", () => {
  console.log(`CandleWay server running on port ${PORT}`);
  if (isDev) console.log(`Proxying frontend from Vite on port ${VITE_PORT}`);
  console.log(`Supabase URL: ${SUPABASE_URL ? "✓ configured" : "✗ MISSING"}`);
  console.log(`Supabase Key: ${SUPABASE_ANON_KEY ? "✓ configured" : "✗ MISSING"}`);
  console.log(`Google AI Key: ${GOOGLE_API_KEY ? "✓ configured" : "✗ MISSING"}`);
});

export default app;
