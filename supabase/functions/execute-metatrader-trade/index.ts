import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, symbol, volume, stopLoss, takeProfit, direction, tradeId } = await req.json();

    // Fetch user's MetaTrader settings from DB
    const serviceClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: mtSettings } = await serviceClient
      .from('metatrader_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    // Use per-user credentials, fall back to global env secrets
    const metaapiToken = mtSettings?.api_token || Deno.env.get('METAAPI_TOKEN');
    const metaapiAccountId = mtSettings?.account_id || Deno.env.get('METAAPI_ACCOUNT_ID');
    const serverRegion = mtSettings?.server_region || 'new-york';

    if (!metaapiToken || !metaapiAccountId) {
      return new Response(JSON.stringify({ error: 'MetaTrader not configured. Add your credentials in Settings.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const baseUrl = `https://mt-client-api-v1.${serverRegion}.agiliumtrade.ai/users/current/accounts/${metaapiAccountId}`;

    if (action === 'get-account-info') {
      const res = await fetch(`${baseUrl}/account-information`, {
        headers: { 'auth-token': metaapiToken, 'Accept': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) {
        return new Response(JSON.stringify({ error: data.message || 'Failed to get account info' }), {
          status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ success: true, account: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'execute-trade') {
      const normalizedSymbol = symbol.replace('/', '');
      const actionType = direction === 'BUY' ? 'ORDER_TYPE_BUY' : 'ORDER_TYPE_SELL';

      const tradePayload: Record<string, unknown> = {
        actionType,
        symbol: normalizedSymbol,
        volume: volume || 0.01,
      };

      if (stopLoss && stopLoss > 0) tradePayload.stopLoss = stopLoss;
      if (takeProfit && takeProfit > 0) tradePayload.takeProfit = takeProfit;

      console.log('Executing MetaApi trade:', JSON.stringify(tradePayload));

      const res = await fetch(`${baseUrl}/trade`, {
        method: 'POST',
        headers: {
          'auth-token': metaapiToken,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(tradePayload),
      });

      const data = await res.json();
      console.log('MetaApi response:', JSON.stringify(data));

      if (!res.ok || (data.stringCode && data.stringCode !== 'TRADE_RETCODE_DONE')) {
        return new Response(JSON.stringify({
          error: data.message || data.stringCode || 'Trade execution failed',
          details: data,
        }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const slPrice = stopLoss || 0;
      const tpPrice = takeProfit || 0;
      const entryPrice = data.orderId ? 0 : (slPrice + tpPrice) / 2;

      await serviceClient.from('trades').insert({
        user_id: user.id,
        pair: symbol,
        direction,
        entry_price: entryPrice,
        stop_loss: slPrice,
        take_profit: tpPrice,
        lot_size: volume || 0.01,
        status: 'open',
        outcome: 'pending',
        pnl: 0,
        execution_mode: 'live',
        confidence: null,
        notes: `MetaApi order: ${data.orderId || 'market'}`,
      });

      return new Response(JSON.stringify({
        success: true,
        orderId: data.orderId,
        stringCode: data.stringCode,
        message: data.message,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'get-positions') {
      const res = await fetch(`${baseUrl}/positions`, {
        headers: { 'auth-token': metaapiToken, 'Accept': 'application/json' },
      });
      const data = await res.json();
      return new Response(JSON.stringify({ success: true, positions: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'close-position') {
      const res = await fetch(`${baseUrl}/trade`, {
        method: 'POST',
        headers: {
          'auth-token': metaapiToken,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          actionType: 'POSITION_CLOSE_ID',
          positionId: tradeId,
        }),
      });
      const data = await res.json();
      return new Response(JSON.stringify({ success: true, ...data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Edge function error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
