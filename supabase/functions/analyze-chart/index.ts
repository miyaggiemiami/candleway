import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
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
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Analyzing chart: ${pair} | ${timeframe} | ${style}`);

    const systemPrompt = `You are an expert trading chart analyst. Analyze the provided trading chart image and return a detailed analysis in JSON format.

The user is analyzing: ${pair} on ${timeframe} timeframe with ${style} trading style.

You must analyze:
- Candlestick patterns (pin bar, engulfing, doji, hammer, morning/evening star, etc.)
- Market structure (higher highs/lows, lower highs/lows, consolidation)
- Support and resistance levels (identify specific price levels)
- Supply and demand zones
- Chart patterns (double top/bottom, head & shoulders, triangles, wedges, flags, channels)
- Trend direction and strength
- Breakouts or fakeouts
- Price action signals

Based on your analysis, provide:
1. Overall trend direction
2. Trading bias (Buy, Sell, or No Trade)
3. Probability score (0-100%)
4. Risk score (1-10, where 10 is highest risk)
5. Support and resistance levels
6. Detected patterns
7. Stop loss and take profit recommendations appropriate for the trading style
8. Possible outcomes
9. Detailed reasoning

IMPORTANT: Return ONLY valid JSON in this exact structure:
{
  "trend": "Uptrend" | "Downtrend" | "Sideways",
  "bias": "Buy" | "Sell" | "No Trade",
  "probability": <number 0-100>,
  "riskScore": <number 1-10>,
  "supportLevels": ["level1", "level2", "level3"],
  "resistanceLevels": ["level1", "level2", "level3"],
  "marketStructure": "<description of market structure>",
  "detectedPatterns": ["pattern1", "pattern2"],
  "supplyDemandZones": ["zone1", "zone2"],
  "possibleOutcomes": ["outcome1", "outcome2", "outcome3"],
  "stopLoss": "<price level or pips>",
  "takeProfit": "<price level or pips>",
  "reasoning": "<detailed explanation of your analysis>"
}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Please analyze this ${pair} chart on ${timeframe} timeframe for ${style} trading. Provide your analysis in the JSON format specified.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageBase64
                }
              }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.error('Rate limit exceeded');
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        console.error('Payment required');
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
      console.error('No content in AI response');
      return new Response(
        JSON.stringify({ error: 'No analysis generated' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('AI Response received, parsing...');

    // Extract JSON from the response (handle markdown code blocks)
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

    // Add metadata
    const result = {
      ...analysis,
      pair,
      timeframe,
      style,
      disclaimer: "Not financial advice. Probability-based analysis only. Always manage your risk appropriately."
    };

    console.log('Analysis complete:', result.bias, result.probability + '%');

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
