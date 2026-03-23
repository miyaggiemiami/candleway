import express from "express";
import cors from "cors";
import { createServer } from "http";

const app = express();
app.use(cors());
app.use(express.json({ limit: "20mb" }));

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY || "";
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";

function supabaseFunctionHeaders(authHeader?: string) {
  return {
    Authorization: authHeader || `Bearer ${SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
    apikey: SUPABASE_ANON_KEY,
  };
}

app.post("/api/analyze-chart", async (req, res) => {
  try {
    const { imageBase64, pair, timeframe, style } = req.body;

    if (!imageBase64) {
      return res.json({ error: "No image provided" });
    }

    if (!LOVABLE_API_KEY) {
      return res.json({ error: "AI service not configured. Please add LOVABLE_API_KEY to secrets." });
    }

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
- direction: BUY only if multiple confluences align bullish. SELL only if bearish confluences align. WAIT if confluence is weak, mixed, or unclear.
- confidence: 0-100. Reduce for poor chart clarity, mixed signals, or ranging markets. Only 80+ for strong multi-factor confluence.
- risk_level: Low (clear trend + pattern), Medium (some confluence), High (counter-trend or unclear)
- NEVER guarantee profit. If analysis is unclear direction must be WAIT.
- Confidence must genuinely reflect structure alignment, trend strength, momentum, and S/R confluence.

IMPORTANT: Return ONLY valid JSON in this exact structure:
{
  "direction": "BUY" | "SELL" | "WAIT",
  "trend": "Uptrend" | "Downtrend" | "Sideways",
  "bias": "Buy" | "Sell" | "No Trade",
  "confidence": <number 0-100>,
  "probability": <number 0-100>,
  "risk_level": "Low" | "Medium" | "High",
  "riskScore": <number 1-10>,
  "entry": "<specific price level>",
  "stop_loss": "<specific price level>",
  "take_profit": "<specific price level>",
  "risk_reward": "<ratio like 1:2.5>",
  "supportLevels": ["level1", "level2", "level3"],
  "resistanceLevels": ["level1", "level2", "level3"],
  "marketStructure": "<HH/HL/LH/LL description>",
  "detectedPatterns": ["pattern1", "pattern2"],
  "supplyDemandZones": ["zone1", "zone2"],
  "possibleOutcomes": [
    {"scenario": "Bullish", "probability": 60, "description": "..."},
    {"scenario": "Bearish", "probability": 30, "description": "..."},
    {"scenario": "Sideways", "probability": 10, "description": "..."}
  ],
  "reasoning": "<detailed institutional-grade explanation>"
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: `Analyze this ${pair} chart on ${timeframe} timeframe for ${style} trading. Return structured JSON analysis.` },
              { type: "image_url", image_url: { url: imageBase64 } },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return res.json({ error: "Rate limit exceeded. Please try again later." });
      if (response.status === 402) return res.json({ error: "AI credits exhausted. Please add credits to continue." });
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return res.json({ error: "Failed to analyze chart" });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) return res.json({ error: "No analysis generated" });

    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1].trim();

    let analysis;
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

    const result = {
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
    };

    return res.json(result);
  } catch (error: any) {
    console.error("Error in analyze-chart:", error);
    return res.json({ error: error.message || "An unexpected error occurred" });
  }
});

app.post("/api/ai-chat", async (req, res) => {
  try {
    const { messages } = req.body;

    if (!LOVABLE_API_KEY) {
      return res.status(500).json({ error: "AI service not configured. Please add LOVABLE_API_KEY to secrets." });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are CandleWay AI, a friendly trading assistant built into the CandleWay platform. You help users with:
- Understanding chart analysis results (trend, bias, support/resistance, patterns)
- Explaining trading concepts (lot sizing, risk-reward, stop loss, take profit)
- Guiding them through the app features (chart upload, analysis, trade execution modes: Manual, Assisted, Auto Trade)
- MetaTrader connection setup via Settings page (MetaApi credentials)
- Risk management settings (confidence threshold, max daily trades, kill switch)
- Subscription and pricing questions

Keep answers concise, practical, and beginner-friendly. Use trading terminology but explain it simply.
Never give specific financial advice or guarantee profits. Always remind users that trading involves risk.
Format responses with markdown when helpful.`,
          },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return res.status(429).json({ error: "Rate limit exceeded. Please try again shortly." });
      }
      if (response.status === 402) {
        return res.status(402).json({ error: "AI credits exhausted. Please try again later." });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return res.status(500).json({ error: "AI service unavailable" });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const reader = response.body!.getReader();
    const pump = async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          res.end();
          break;
        }
        res.write(value);
      }
    };
    await pump();
  } catch (e: any) {
    console.error("ai-chat error:", e);
    return res.status(500).json({ error: e.message || "Unknown error" });
  }
});

app.post("/api/check-subscription", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "No authorization header provided" });

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/check-subscription`, {
      method: "POST",
      headers: supabaseFunctionHeaders(authHeader),
    });
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

app.post("/api/create-checkout", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "No authorization header provided" });

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/create-checkout`, {
      method: "POST",
      headers: supabaseFunctionHeaders(authHeader),
    });
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

app.post("/api/customer-portal", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "No authorization header provided" });

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/customer-portal`, {
      method: "POST",
      headers: supabaseFunctionHeaders(authHeader),
    });
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

app.post("/api/execute-metatrader-trade", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/execute-metatrader-trade`, {
      method: "POST",
      headers: supabaseFunctionHeaders(authHeader),
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

const PORT = parseInt(process.env.API_PORT || "3001", 10);
app.listen(PORT, "0.0.0.0", () => {
  console.log(`CandleWay API server running on port ${PORT}`);
});

export default app;
