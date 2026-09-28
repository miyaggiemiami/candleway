import { useEffect, useRef, useState, useCallback } from "react";
import { createChart, CandlestickSeries, ColorType, CrosshairMode, type IChartApi, type ISeriesApi, type CandlestickData } from "lightweight-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp, TrendingDown, Wifi, WifiOff, RefreshCw,
  Settings, ChevronDown, CheckCircle2, XCircle, Loader2,
  Activity,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

type Symbol = "EURUSD" | "GBPUSD" | "USDJPY" | "XAUUSD" | "BTCUSD" | "AUDUSD";
type TF = "M5" | "M15" | "H1" | "H4" | "D1";

interface TradeResult {
  success: boolean;
  action: "BUY" | "SELL";
  symbol: string;
  volume: number;
  message: string;
  deal_id?: number;
  price_filled?: number;
  timestamp: Date;
}

// ─── Candlestick Data Generators ─────────────────────────────────────────────

function generateCandles(base: number, spread: number, count: number, startTs: number, intervalSec: number): CandlestickData[] {
  const candles: CandlestickData[] = [];
  let price = base;
  for (let i = 0; i < count; i++) {
    const time = (startTs + i * intervalSec) as any;
    const change = (Math.random() - 0.49) * spread;
    const open = price;
    price += change;
    const close = price;
    const high = Math.max(open, close) + Math.random() * spread * 0.6;
    const low  = Math.min(open, close) - Math.random() * spread * 0.6;
    candles.push({ time, open: +open.toFixed(5), high: +high.toFixed(5), low: +low.toFixed(5), close: +close.toFixed(5) });
  }
  return candles;
}

const SYMBOL_CONFIG: Record<Symbol, { base: number; spread: number; digits: number; pip: number }> = {
  EURUSD: { base: 1.0850, spread: 0.0012, digits: 5, pip: 0.0001 },
  GBPUSD: { base: 1.2700, spread: 0.0018, digits: 5, pip: 0.0001 },
  USDJPY: { base: 149.50, spread: 0.15,   digits: 3, pip: 0.01   },
  XAUUSD: { base: 2340.0, spread: 2.5,    digits: 2, pip: 0.1    },
  BTCUSD: { base: 67500,  spread: 80,     digits: 1, pip: 1       },
  AUDUSD: { base: 0.6550, spread: 0.0010, digits: 5, pip: 0.0001 },
};

const TF_CONFIG: Record<TF, { intervalSec: number; count: number; label: string }> = {
  M5:  { intervalSec: 300,   count: 120, label: "5m"  },
  M15: { intervalSec: 900,   count: 120, label: "15m" },
  H1:  { intervalSec: 3600,  count: 120, label: "1h"  },
  H4:  { intervalSec: 14400, count: 90,  label: "4h"  },
  D1:  { intervalSec: 86400, count: 60,  label: "1D"  },
};

function buildCandles(symbol: Symbol, tf: TF): CandlestickData[] {
  const cfg = SYMBOL_CONFIG[symbol];
  const tfCfg = TF_CONFIG[tf];
  const now = Math.floor(Date.now() / 1000);
  const startTs = now - tfCfg.count * tfCfg.intervalSec;
  return generateCandles(cfg.base, cfg.spread, tfCfg.count, startTs, tfCfg.intervalSec);
}

// ─── Chart Component ──────────────────────────────────────────────────────────

export function LiveChartPanel() {
  const { toast } = useToast();
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  const [symbol, setSymbol] = useState<Symbol>("EURUSD");
  const [tf, setTf] = useState<TF>("H1");
  const [candles, setCandles] = useState<CandlestickData[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [priceChange, setPriceChange] = useState<number>(0);

  const [lotSize, setLotSize] = useState("0.01");
  const [bridgeUrl, setBridgeUrl] = useState(() => localStorage.getItem("mt5_bridge_url") || "http://localhost:8000");
  const [showBridgeSettings, setShowBridgeSettings] = useState(false);
  const [bridgeStatus, setBridgeStatus] = useState<"unknown" | "online" | "offline">("unknown");
  const [executing, setExecuting] = useState<"BUY" | "SELL" | null>(null);
  const [lastResult, setLastResult] = useState<TradeResult | null>(null);

  // ── Chart init ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#9ca3af",
        fontSize: 11,
        fontFamily: "'Inter', sans-serif",
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.04)" },
        horzLines: { color: "rgba(255,255,255,0.04)" },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.08)",
        textColor: "#9ca3af",
      },
      timeScale: {
        borderColor: "rgba(255,255,255,0.08)",
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 8,
      },
      width: chartContainerRef.current.clientWidth,
      height: 320,
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor:          "#22c55e",
      downColor:        "#ef4444",
      borderUpColor:    "#22c55e",
      borderDownColor:  "#ef4444",
      wickUpColor:      "#16a34a",
      wickDownColor:    "#dc2626",
    });

    chartRef.current  = chart;
    seriesRef.current = series;

    const ro = new ResizeObserver(entries => {
      if (entries[0]) chart.applyOptions({ width: entries[0].contentRect.width });
    });
    ro.observe(chartContainerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
    };
  }, []);

  // ── Load candles whenever symbol/tf changes ─────────────────────────────────
  useEffect(() => {
    const data = buildCandles(symbol, tf);
    setCandles(data);
    if (seriesRef.current) {
      seriesRef.current.setData(data);
      chartRef.current?.timeScale().fitContent();
    }
    const last = data[data.length - 1];
    const first = data[0];
    setCurrentPrice(last.close);
    setPriceChange(+((last.close - first.open) / first.open * 100).toFixed(3));
  }, [symbol, tf]);

  // ── Tick simulation ─────────────────────────────────────────────────────────
  useEffect(() => {
    const cfg = SYMBOL_CONFIG[symbol];
    const interval = setInterval(() => {
      if (!seriesRef.current || candles.length === 0) return;
      setCandles(prev => {
        const last = { ...prev[prev.length - 1] };
        const tick = (Math.random() - 0.499) * cfg.spread * 0.3;
        last.close = +(last.close + tick).toFixed(cfg.digits);
        last.high  = Math.max(last.high, last.close);
        last.low   = Math.min(last.low, last.close);
        seriesRef.current?.update(last);
        setCurrentPrice(last.close);
        return [...prev.slice(0, -1), last];
      });
    }, 1500);
    return () => clearInterval(interval);
  }, [symbol, candles.length]);

  // ── Bridge health check ─────────────────────────────────────────────────────
  const checkBridge = useCallback(async () => {
    try {
      const r = await fetch(`${bridgeUrl}/health`, { signal: AbortSignal.timeout(3000) });
      setBridgeStatus(r.ok ? "online" : "offline");
    } catch {
      setBridgeStatus("offline");
    }
  }, [bridgeUrl]);

  useEffect(() => { checkBridge(); }, [checkBridge]);

  const saveBridgeUrl = (url: string) => {
    const clean = url.replace(/\/$/, "");
    setBridgeUrl(clean);
    localStorage.setItem("mt5_bridge_url", clean);
    setBridgeStatus("unknown");
    setTimeout(() => checkBridge(), 200);
  };

  // ── Execute trade ───────────────────────────────────────────────────────────
  const executeTrade = async (action: "BUY" | "SELL") => {
    const vol = parseFloat(lotSize);
    if (isNaN(vol) || vol <= 0) {
      toast({ title: "Invalid lot size", description: "Enter a positive number (e.g. 0.01)", variant: "destructive" });
      return;
    }
    if (bridgeStatus !== "online") {
      toast({
        title: "MT5 Bridge Offline",
        description: "Start mt5_bridge.py on your PC first, then update the bridge URL below.",
        variant: "destructive",
      });
      return;
    }

    setExecuting(action);
    try {
      const res = await fetch(`${bridgeUrl}/execute-trade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol, action, volume: vol }),
        signal: AbortSignal.timeout(8000),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        const result: TradeResult = {
          success: true,
          action, symbol, volume: vol,
          message: data.message || "Trade executed",
          deal_id: data.deal_id,
          price_filled: data.price_filled,
          timestamp: new Date(),
        };
        setLastResult(result);
        toast({
          title: `✅ ${action} executed`,
          description: `${symbol} ${vol} lot${vol !== 1 ? "s" : ""} @ ${data.price_filled ?? "market"} · Deal #${data.deal_id ?? "–"}`,
        });
      } else {
        const errMsg = typeof data.detail === "object"
          ? data.detail.reason || data.detail.message || JSON.stringify(data.detail)
          : data.detail || data.error || "Unknown error";
        const result: TradeResult = {
          success: false,
          action, symbol, volume: vol,
          message: errMsg,
          timestamp: new Date(),
        };
        setLastResult(result);
        toast({ title: `❌ Trade rejected`, description: errMsg, variant: "destructive" });
      }
    } catch (e: any) {
      const msg = e.name === "TimeoutError" ? "Request timed out — is mt5_bridge.py running?" : e.message;
      setLastResult({ success: false, action, symbol, volume: vol, message: msg, timestamp: new Date() });
      toast({ title: "Connection failed", description: msg, variant: "destructive" });
    } finally {
      setExecuting(null);
    }
  };

  const cfg = SYMBOL_CONFIG[symbol];
  const isUp = priceChange >= 0;

  return (
    <div className="space-y-4">
      {/* ── Chart card ── */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            {/* Symbol picker */}
            <div className="flex items-center gap-2 flex-wrap">
              {(Object.keys(SYMBOL_CONFIG) as Symbol[]).map(s => (
                <button
                  key={s}
                  onClick={() => setSymbol(s)}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                    symbol === s
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary/40 text-muted-foreground hover:bg-secondary/80"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Price */}
            <div className="flex items-center gap-2">
              <span className="font-mono text-lg font-bold tabular-nums">
                {currentPrice.toFixed(cfg.digits)}
              </span>
              <Badge
                variant="outline"
                className={`text-xs ${isUp ? "border-green-500/50 text-green-400" : "border-red-500/50 text-red-400"}`}
              >
                {isUp ? "+" : ""}{priceChange}%
              </Badge>
            </div>
          </div>

          {/* Timeframe tabs */}
          <div className="flex gap-1 mt-2">
            {(Object.keys(TF_CONFIG) as TF[]).map(t => (
              <button
                key={t}
                onClick={() => setTf(t)}
                className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                  tf === t
                    ? "bg-primary/20 text-primary border border-primary/40"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {TF_CONFIG[t].label}
              </button>
            ))}
          </div>
        </CardHeader>

        <div ref={chartContainerRef} className="w-full px-0" />
      </Card>

      {/* ── Trading panel ── */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              MT5 Direct Trading
            </span>
            <div className="flex items-center gap-2">
              {bridgeStatus === "online" && (
                <Badge variant="outline" className="text-xs border-green-500/50 text-green-400 gap-1">
                  <Wifi className="h-3 w-3" /> Bridge Online
                </Badge>
              )}
              {bridgeStatus === "offline" && (
                <Badge variant="outline" className="text-xs border-red-500/50 text-red-400 gap-1">
                  <WifiOff className="h-3 w-3" /> Bridge Offline
                </Badge>
              )}
              {bridgeStatus === "unknown" && (
                <Badge variant="outline" className="text-xs text-muted-foreground gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Checking…
                </Badge>
              )}
              <button
                onClick={() => setShowBridgeSettings(x => !x)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                title="Bridge settings"
              >
                <Settings className="h-4 w-4" />
              </button>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="px-4 pb-4 space-y-4">
          {/* Bridge URL settings panel */}
          {showBridgeSettings && (
            <div className="p-3 rounded-lg bg-secondary/30 border border-border/50 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">MT5 Bridge URL</Label>
                <div className="flex gap-2">
                  <Input
                    value={bridgeUrl}
                    onChange={e => setBridgeUrl(e.target.value)}
                    onBlur={e => saveBridgeUrl(e.target.value)}
                    placeholder="http://localhost:8000"
                    className="font-mono text-xs h-8"
                  />
                  <Button variant="outline" size="sm" className="h-8 px-2 shrink-0" onClick={checkBridge}>
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Run <code className="bg-secondary px-1 rounded">python mt5_bridge.py</code> on your PC. For remote access, use ngrok and paste the https URL here.
                </p>
              </div>
            </div>
          )}

          {/* Lot size */}
          <div className="space-y-1.5">
            <Label className="text-sm">Lot Size</Label>
            <Input
              type="number"
              value={lotSize}
              onChange={e => setLotSize(e.target.value)}
              min="0.01"
              step="0.01"
              className="font-mono text-base h-11 text-center text-lg font-semibold"
            />
            <div className="flex gap-1">
              {["0.01", "0.05", "0.1", "0.5", "1.0"].map(v => (
                <button
                  key={v}
                  onClick={() => setLotSize(v)}
                  className={`flex-1 py-1 rounded text-xs transition-all ${
                    lotSize === v
                      ? "bg-primary/20 text-primary border border-primary/40"
                      : "bg-secondary/40 text-muted-foreground hover:bg-secondary/80"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* BUY / SELL */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => executeTrade("BUY")}
              disabled={!!executing}
              className={`
                relative h-16 rounded-xl font-bold text-lg tracking-wide transition-all
                flex flex-col items-center justify-center gap-0.5
                disabled:opacity-60 disabled:cursor-not-allowed
                ${executing === "BUY"
                  ? "bg-green-600 scale-95"
                  : "bg-green-500 hover:bg-green-400 active:scale-95 shadow-lg shadow-green-900/30"
                }
                text-white
              `}
            >
              {executing === "BUY" ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <TrendingUp className="h-5 w-5" />
                  <span>BUY</span>
                  <span className="text-xs font-normal opacity-80">{currentPrice.toFixed(cfg.digits)}</span>
                </>
              )}
            </button>

            <button
              onClick={() => executeTrade("SELL")}
              disabled={!!executing}
              className={`
                relative h-16 rounded-xl font-bold text-lg tracking-wide transition-all
                flex flex-col items-center justify-center gap-0.5
                disabled:opacity-60 disabled:cursor-not-allowed
                ${executing === "SELL"
                  ? "bg-red-700 scale-95"
                  : "bg-red-600 hover:bg-red-500 active:scale-95 shadow-lg shadow-red-900/30"
                }
                text-white
              `}
            >
              {executing === "SELL" ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <TrendingDown className="h-5 w-5" />
                  <span>SELL</span>
                  <span className="text-xs font-normal opacity-80">{currentPrice.toFixed(cfg.digits)}</span>
                </>
              )}
            </button>
          </div>

          {/* Last trade result */}
          {lastResult && (
            <div className={`flex items-start gap-2 p-3 rounded-lg text-xs border ${
              lastResult.success
                ? "bg-green-500/10 border-green-500/30 text-green-400"
                : "bg-red-500/10 border-red-500/30 text-red-400"
            }`}>
              {lastResult.success
                ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                : <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
              }
              <div className="flex-1 min-w-0">
                <p className="font-semibold">
                  {lastResult.success ? "Trade Executed" : "Trade Rejected"} — {lastResult.action} {lastResult.symbol} {lastResult.volume}L
                </p>
                <p className="text-muted-foreground mt-0.5 truncate">{lastResult.message}</p>
                {lastResult.deal_id && (
                  <p className="text-muted-foreground">Deal #{lastResult.deal_id} · filled @ {lastResult.price_filled}</p>
                )}
              </div>
            </div>
          )}

          {/* Offline help */}
          {bridgeStatus === "offline" && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-400 space-y-1">
              <p className="font-semibold">Bridge not reachable</p>
              <p>1. Open MT5 on your PC and enable Auto-Trading</p>
              <p>2. Run <code className="bg-black/30 px-1 rounded">python mt5_bridge.py</code></p>
              <p>3. For remote access, run <code className="bg-black/30 px-1 rounded">ngrok http 8000</code> and paste the URL in ⚙️ settings above</p>
            </div>
          )}

          <p className="text-[10px] text-center text-muted-foreground">
            Trades execute directly on your MT5 terminal via your local bridge server
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
