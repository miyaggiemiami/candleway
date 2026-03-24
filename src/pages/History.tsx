import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, Minus, Calendar, Download, Filter, Clock, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Bias } from "@/types/analysis";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { AnalysisDetailDialog } from "@/components/analysis/AnalysisDetailDialog";

interface AnalysisRecord {
  id: string;
  created_at: string;
  pair: string;
  timeframe: string;
  style: string;
  trend: string;
  bias: string;
  probability: number;
  risk_score: number;
  support_levels: string[];
  resistance_levels: string[];
  market_structure: string;
  detected_patterns: string[];
  supply_demand_zones: string[];
  possible_outcomes: string[];
  stop_loss: string;
  take_profit: string;
  reasoning: string;
  image_url?: string;
}

const getBiasIcon = (bias: string) => {
  switch (bias) {
    case "Buy": return <TrendingUp className="h-4 w-4" />;
    case "Sell": return <TrendingDown className="h-4 w-4" />;
    default: return <Minus className="h-4 w-4" />;
  }
};

const getBiasVariant = (bias: string): "buy" | "sell" | "neutral" => {
  switch (bias) {
    case "Buy": return "buy";
    case "Sell": return "sell";
    default: return "neutral";
  }
};

export default function History() {
  const [filterPair, setFilterPair] = useState<string>("all");
  const [filterBias, setFilterBias] = useState<string>("all");
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnalysis, setSelectedAnalysis] = useState<AnalysisRecord | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) fetchAnalyses();
    else setLoading(false);
  }, [user]);

  const fetchAnalyses = async () => {
    try {
      const data = await api.analyses.list();
      setAnalyses(data || []);
    } catch (error) {
      console.error('Error fetching analyses:', error);
      toast({ title: "Error", description: "Failed to load analysis history.", variant: "destructive" });
    }
    setLoading(false);
  };

  const filteredHistory = analyses.filter(item => {
    if (filterPair !== "all" && item.pair !== filterPair) return false;
    if (filterBias !== "all" && item.bias !== filterBias) return false;
    return true;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  const exportAllAnalyses = () => {
    if (filteredHistory.length === 0) {
      toast({ title: "No data to export", description: "There are no analyses to export.", variant: "destructive" });
      return;
    }
    const csvContent = [
      ["Date", "Time", "Pair", "Timeframe", "Style", "Bias", "Probability", "Risk Score", "Stop Loss", "Take Profit", "Patterns"].join(","),
      ...filteredHistory.map(item => [
        formatDate(item.created_at), formatTime(item.created_at), item.pair, item.timeframe, item.style,
        item.bias, item.probability, item.risk_score, item.stop_loss || "-", item.take_profit || "-",
        `"${(item.detected_patterns || []).join("; ")}"`,
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `candleway-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Export Complete", description: `Exported ${filteredHistory.length} analyses.` });
  };

  const uniquePairs = [...new Set(analyses.map(a => a.pair))];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Analysis History</h1>
            <p className="text-muted-foreground">View your past chart analyses</p>
          </div>
          <Button variant="outline" className="gap-2" onClick={exportAllAnalyses}>
            <Download className="h-4 w-4" />Export All
          </Button>
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Filters:</span>
          </div>
          <Select value={filterPair} onValueChange={setFilterPair}>
            <SelectTrigger className="w-[140px] glass-card"><SelectValue placeholder="All Pairs" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Pairs</SelectItem>
              {uniquePairs.map(pair => <SelectItem key={pair} value={pair}>{pair}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterBias} onValueChange={setFilterBias}>
            <SelectTrigger className="w-[140px] glass-card"><SelectValue placeholder="All Signals" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Signals</SelectItem>
              <SelectItem value="Buy">Buy</SelectItem>
              <SelectItem value="Sell">Sell</SelectItem>
              <SelectItem value="No Trade">No Trade</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !user ? (
          <Card className="glass-card">
            <CardContent className="py-12 text-center">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Sign in to view history</h3>
              <p className="text-muted-foreground mb-4">Please sign in to access your analysis history</p>
              <Button variant="default" onClick={() => window.location.href = "/auth"}>Sign In</Button>
            </CardContent>
          </Card>
        ) : filteredHistory.length > 0 ? (
          <div className="space-y-4">
            {filteredHistory.map((item) => (
              <Card key={item.id} className="glass-card hover:border-primary/30 transition-colors cursor-pointer"
                onClick={() => { setSelectedAnalysis(item); setDialogOpen(true); }}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex items-center gap-3 sm:min-w-[140px]">
                      <div className="h-10 w-10 rounded-lg bg-secondary/50 flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{formatDate(item.created_at)}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />{formatTime(item.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{item.pair}</span>
                        <Badge variant="outline" className="text-xs">{item.timeframe}</Badge>
                        <Badge variant="secondary" className="text-xs">{item.style}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {(item.detected_patterns || []).join(", ") || "No patterns"}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-2xl font-bold gradient-text">{item.probability}%</p>
                        <p className="text-xs text-muted-foreground">Probability</p>
                      </div>
                      <Badge variant={getBiasVariant(item.bias)} className="gap-1 min-w-[80px] justify-center">
                        {getBiasIcon(item.bias)}{item.bias}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="glass-card">
            <CardContent className="py-12 text-center">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No analyses found</h3>
              <p className="text-muted-foreground mb-4">
                {filterPair !== "all" || filterBias !== "all" ? "Try adjusting your filters" : "Start analyzing charts to build your history"}
              </p>
              <Button variant="default" onClick={() => window.location.href = "/"}>Analyze a Chart</Button>
            </CardContent>
          </Card>
        )}

        <AnalysisDetailDialog analysis={selectedAnalysis} open={dialogOpen} onOpenChange={setDialogOpen} />
      </main>
    </div>
  );
}
