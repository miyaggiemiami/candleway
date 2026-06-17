import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, RefreshCw } from "lucide-react";

interface FGData {
  value: number;
  classification: string;
  timestamp: string;
}

function getColor(v: number) {
  if (v <= 20) return "#ef4444";
  if (v <= 40) return "#f97316";
  if (v <= 60) return "#eab308";
  if (v <= 80) return "#84cc16";
  return "#22c55e";
}

function getLabel(v: number) {
  if (v <= 20) return "Extreme Fear";
  if (v <= 40) return "Fear";
  if (v <= 60) return "Neutral";
  if (v <= 80) return "Greed";
  return "Extreme Greed";
}

function Gauge({ value }: { value: number }) {
  const r = 72;
  const cx = 100;
  const cy = 100;
  const startAngle = 180;
  const endAngle = 0;
  const pct = value / 100;
  const angle = startAngle - pct * 180;
  const rad = (a: number) => (a * Math.PI) / 180;

  const arcPath = (from: number, to: number, radius: number) => {
    const x1 = cx + radius * Math.cos(rad(from));
    const y1 = cy - radius * Math.sin(rad(from));
    const x2 = cx + radius * Math.cos(rad(to));
    const y2 = cy - radius * Math.sin(rad(to));
    return `M ${x1} ${y1} A ${radius} ${radius} 0 0 0 ${x2} ${y2}`;
  };

  const segments = [
    { from: 180, to: 144, color: "#ef4444" },
    { from: 144, to: 108, color: "#f97316" },
    { from: 108, to:  72, color: "#eab308" },
    { from:  72, to:  36, color: "#84cc16" },
    { from:  36, to:   0, color: "#22c55e" },
  ];

  const needleX = cx + (r - 8) * Math.cos(rad(angle));
  const needleY = cy - (r - 8) * Math.sin(rad(angle));
  const color = getColor(value);

  return (
    <svg viewBox="0 0 200 108" className="w-full max-w-[220px] mx-auto">
      {segments.map((s, i) => (
        <path
          key={i}
          d={arcPath(s.from, s.to, r)}
          fill="none"
          stroke={s.color}
          strokeWidth={14}
          strokeLinecap="butt"
          opacity={0.85}
        />
      ))}
      <path
        d={arcPath(180, 0, r)}
        fill="none"
        stroke="transparent"
        strokeWidth={14}
      />
      <line
        x1={cx}
        y1={cy}
        x2={needleX}
        y2={needleY}
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
      />
      <circle cx={cx} cy={cy} r={5} fill={color} />
      <text x={cx} y={cy + 16} textAnchor="middle" fontSize={22} fontWeight="bold" fill={color}>
        {value}
      </text>
    </svg>
  );
}

export function FearGreedMeter() {
  const [data, setData] = useState<FGData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/fear-greed");
      if (!r.ok) throw new Error("fetch failed");
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      setData(d);
    } catch (e: any) {
      setError("Unable to load live data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const color = data ? getColor(data.value) : "#6b7280";
  const label = data ? getLabel(data.value) : "";

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          Crypto Fear &amp; Greed
        </CardTitle>
        <button
          onClick={load}
          className="text-muted-foreground hover:text-foreground transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </CardHeader>
      <CardContent className="pt-0 flex flex-col items-center gap-1">
        {loading && !data && (
          <div className="py-6 text-muted-foreground text-sm">Loading…</div>
        )}
        {error && !data && (
          <div className="py-6 text-destructive text-xs text-center">{error}</div>
        )}
        {data && (
          <>
            <Gauge value={data.value} />
            <p className="text-base font-bold mt-1" style={{ color }}>
              {label}
            </p>
            <p className="text-xs text-muted-foreground">
              {data.classification} · {new Date(parseInt(data.timestamp) * 1000).toLocaleDateString()}
            </p>
            <div className="flex gap-3 mt-2 text-[10px] text-muted-foreground">
              <span className="text-red-400">0 Extreme Fear</span>
              <span className="text-yellow-400">50 Neutral</span>
              <span className="text-green-400">100 Extreme Greed</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
