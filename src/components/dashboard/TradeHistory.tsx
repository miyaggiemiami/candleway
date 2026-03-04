import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, TrendingUp, TrendingDown } from "lucide-react";
import { Trade } from "@/types/trading";

interface TradeHistoryProps {
  trades: Trade[];
}

export function TradeHistory({ trades }: TradeHistoryProps) {
  const closedTrades = trades
    .filter(t => t.status === 'closed')
    .slice(0, 20);

  if (closedTrades.length === 0) return null;

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          Recent Trades
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {closedTrades.map((trade) => (
            <div key={trade.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/20">
              <div className="flex items-center gap-2">
                {trade.direction === 'BUY' ? (
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5 text-destructive" />
                )}
                <span className="text-sm font-medium">{trade.pair}</span>
                <Badge 
                  variant={trade.outcome === 'win' ? 'buy' : trade.outcome === 'loss' ? 'sell' : 'neutral'}
                  className="text-xs h-5"
                >
                  {trade.outcome}
                </Badge>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-mono ${Number(trade.pnl) >= 0 ? 'text-primary' : 'text-destructive'}`}>
                  {Number(trade.pnl) >= 0 ? '+' : ''}{Number(trade.pnl).toFixed(2)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(trade.opened_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
