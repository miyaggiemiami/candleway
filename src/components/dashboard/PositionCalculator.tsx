import { useState } from "react";
import { Calculator, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const PIP_VALUES: Record<string, number> = {
  "USD pairs":  10,
  "JPY pairs":  0.091,
  "XAU/USD":    1,
  "BTC/USD":    1,
  "ETH/USD":    0.1,
  "GBP pairs":  12.7,
  "EUR pairs":  10,
};

export function PositionCalculator() {
  const [open, setOpen] = useState(false);
  const [balance, setBalance]     = useState("10000");
  const [riskPct, setRiskPct]     = useState("1");
  const [slPips, setSlPips]       = useState("20");
  const [pipType, setPipType]     = useState("USD pairs");

  const balanceNum = parseFloat(balance) || 0;
  const riskNum    = parseFloat(riskPct)  || 0;
  const slNum      = parseFloat(slPips)   || 1;
  const pipValue   = PIP_VALUES[pipType]  || 10;

  const riskAmount = balanceNum * (riskNum / 100);
  const lotSize    = riskAmount / (slNum * pipValue);
  const validLot   = Math.max(0, lotSize);

  return (
    <div className="glass-card overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/20 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Calculator className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Position Size Calculator</span>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-border/30">
          <div className="grid grid-cols-2 gap-3 pt-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Account Balance ($)</Label>
              <Input
                type="number"
                value={balance}
                onChange={e => setBalance(e.target.value)}
                className="h-8 text-sm font-mono"
                placeholder="10000"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Risk per Trade (%)</Label>
              <Input
                type="number"
                value={riskPct}
                onChange={e => setRiskPct(e.target.value)}
                className="h-8 text-sm font-mono"
                placeholder="1"
                step="0.1"
                min="0.1"
                max="10"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Stop Loss (pips)</Label>
              <Input
                type="number"
                value={slPips}
                onChange={e => setSlPips(e.target.value)}
                className="h-8 text-sm font-mono"
                placeholder="20"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Instrument Type</Label>
              <Select value={pipType} onValueChange={setPipType}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(PIP_VALUES).map(k => (
                    <SelectItem key={k} value={k} className="text-xs">{k}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-secondary/40 border border-border/30 p-3 text-center">
              <p className="text-[11px] text-muted-foreground mb-1">Risk Amount</p>
              <p className="text-sm font-bold font-mono text-destructive">${riskAmount.toFixed(2)}</p>
            </div>
            <div className={cn(
              "rounded-lg border p-3 text-center",
              validLot >= 0.01
                ? "bg-primary/10 border-primary/30"
                : "bg-secondary/40 border-border/30"
            )}>
              <p className="text-[11px] text-muted-foreground mb-1">Lot Size</p>
              <p className={cn("text-lg font-bold font-mono", validLot >= 0.01 ? "text-primary" : "text-muted-foreground")}>
                {validLot.toFixed(2)}
              </p>
            </div>
            <div className="rounded-lg bg-secondary/40 border border-border/30 p-3 text-center">
              <p className="text-[11px] text-muted-foreground mb-1">Mini Lots</p>
              <p className="text-sm font-bold font-mono text-foreground">{(validLot * 10).toFixed(1)}</p>
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground text-center">
            Based on standard 100k lot · pip value ~${pipValue}/pip for {pipType}
          </p>
        </div>
      )}
    </div>
  );
}
