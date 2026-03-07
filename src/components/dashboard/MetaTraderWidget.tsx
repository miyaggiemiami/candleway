import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wifi, WifiOff, RefreshCw, Loader2, DollarSign, TrendingUp, Briefcase } from "lucide-react";
import { useMetaTrader } from "@/hooks/useMetaTrader";
import { useEffect, useState } from "react";

interface Position {
  id: string;
  symbol: string;
  type: string;
  volume: number;
  openPrice: number;
  profit: number;
}

export function MetaTraderWidget() {
  const { accountInfo, connected, loading, getAccountInfo, getPositions } = useMetaTrader();
  const [positions, setPositions] = useState<Position[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    getAccountInfo();
  }, [getAccountInfo]);

  useEffect(() => {
    if (connected) {
      getPositions().then(setPositions);
    }
  }, [connected, getPositions]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await getAccountInfo();
    const pos = await getPositions();
    setPositions(pos);
    setRefreshing(false);
  };

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-primary" />
            MetaTrader Account
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleRefresh}
              disabled={loading || refreshing}
            >
              {refreshing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
            </Button>
            {connected ? (
              <Badge variant="outline" className="text-xs border-emerald-500/50 text-emerald-400">
                <Wifi className="h-3 w-3 mr-1" />
                Live
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs border-destructive/50 text-destructive">
                <WifiOff className="h-3 w-3 mr-1" />
                Offline
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && !accountInfo ? (
          <div className="flex items-center justify-center py-6 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Connecting to MetaTrader...
          </div>
        ) : !connected ? (
          <div className="text-center py-4 space-y-2">
            <p className="text-sm text-muted-foreground">
              Configure your MetaTrader credentials in Settings to see live data.
            </p>
            <Button variant="outline" size="sm" onClick={() => window.location.href = '/settings'}>
              Go to Settings
            </Button>
          </div>
        ) : (
          <>
            {/* Account Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-secondary/50 border border-border/50">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <DollarSign className="h-3 w-3" />
                  Balance
                </div>
                <p className="font-mono font-bold text-lg">
                  ${accountInfo?.balance?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '—'}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50 border border-border/50">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <TrendingUp className="h-3 w-3" />
                  Equity
                </div>
                <p className="font-mono font-bold text-lg">
                  ${accountInfo?.equity?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '—'}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50 border border-border/50">
                <p className="text-xs text-muted-foreground mb-1">Free Margin</p>
                <p className="font-mono font-semibold">
                  ${accountInfo?.freeMargin?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '—'}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50 border border-border/50">
                <p className="text-xs text-muted-foreground mb-1">Leverage</p>
                <p className="font-mono font-semibold">1:{accountInfo?.leverage ?? '—'}</p>
              </div>
            </div>

            {/* Open Positions */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">
                Open Positions ({positions.length})
              </h4>
              {positions.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">No open positions</p>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {positions.map((pos, i) => (
                    <div
                      key={pos.id || i}
                      className="flex items-center justify-between p-2 rounded-md bg-secondary/30 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={pos.type?.toLowerCase().includes('buy')
                            ? 'border-emerald-500/50 text-emerald-400'
                            : 'border-destructive/50 text-destructive'}
                        >
                          {pos.type}
                        </Badge>
                        <span className="font-medium">{pos.symbol}</span>
                        <span className="text-muted-foreground">{pos.volume} lot</span>
                      </div>
                      <span className={`font-mono font-semibold ${(pos.profit ?? 0) >= 0 ? 'text-emerald-400' : 'text-destructive'}`}>
                        {(pos.profit ?? 0) >= 0 ? '+' : ''}{pos.profit?.toFixed(2) ?? '0.00'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
