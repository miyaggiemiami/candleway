import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, pair, timeframe, style } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: 'No image provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Analyzing chart: ${pair} | ${timeframe} | ${style}`);

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
- NEVER guarantee profit. If analysis is unclear → direction must be WAIT.
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

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this ${pair} chart on ${timeframe} timeframe for ${style} trading. Return structured JSON analysis.`
              },
              {
                type: 'image_url',
                image_url: { url: imageBase64 }
              }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to analyze chart' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ error: 'No analysis generated' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    let analysis;
    try {
      analysis = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError, 'Content:', content);
      return new Response(
        JSON.stringify({ error: 'Failed to parse analysis results' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize possibleOutcomes to string array for DB compatibility
    let possibleOutcomes = analysis.possibleOutcomes || [];
    if (possibleOutcomes.length > 0 && typeof possibleOutcomes[0] === 'object') {
      possibleOutcomes = possibleOutcomes.map((o: any) => 
        `${o.scenario} (${o.probability}%): ${o.description}`
      );
    }

    const result = {
      ...analysis,
      possibleOutcomes,
      pair,
      timeframe,
      style,
      // Ensure backward compatibility
      stopLoss: analysis.stop_loss || analysis.stopLoss || '-',
      takeProfit: analysis.take_profit || analysis.takeProfit || '-',
      probability: analysis.confidence || analysis.probability || 50,
      riskScore: analysis.riskScore || (analysis.risk_level === 'Low' ? 3 : analysis.risk_level === 'Medium' ? 5 : 8),
      disclaimer: "Not financial advice. Probability-based analysis only. AI is not guaranteed. Always manage your risk."
    };

    console.log('Analysis complete:', result.direction || result.bias, result.probability + '%');

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in analyze-chart function:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
