import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, Minus, Calendar, Download, Filter, Clock } from "lucide-react";
import { useState } from "react";
import { AnalysisResult, Bias, TradingPair, Timeframe, TradingStyle } from "@/types/analysis";

// Mock history data
const mockHistory: AnalysisResult[] = [
  {
    id: "1",
    timestamp: new Date("2025-12-15T10:30:00"),
    pair: "EUR/USD",
    timeframe: "H1",
    style: "Day Trading",
    imageUrl: "",
    trend: "Uptrend",
    bias: "Buy",
    probability: 78,
    riskScore: 4,
    supportLevels: ["1.0850", "1.0820"],
    resistanceLevels: ["1.0920", "1.0950"],
    marketStructure: "Higher Highs, Higher Lows",
    detectedPatterns: ["Bullish Engulfing"],
    supplyDemandZones: ["Demand: 1.0830-1.0850"],
    possibleOutcomes: ["Continuation to 1.0950"],
    stopLoss: "1.0810",
    takeProfit: "1.0950",
    reasoning: "Strong bullish momentum",
    disclaimer: "Not financial advice."
  },
  {
    id: "2",
    timestamp: new Date("2025-12-14T14:15:00"),
    pair: "XAU/USD",
    timeframe: "H4",
    style: "Swing Trading",
    imageUrl: "",
    trend: "Downtrend",
    bias: "Sell",
    probability: 65,
    riskScore: 6,
    supportLevels: ["2020", "2010"],
    resistanceLevels: ["2045", "2060"],
    marketStructure: "Lower Highs, Lower Lows",
    detectedPatterns: ["Head & Shoulders"],
    supplyDemandZones: ["Supply: 2040-2050"],
    possibleOutcomes: ["Break below 2020"],
    stopLoss: "2055",
    takeProfit: "2010",
    reasoning: "Bearish pattern confirmed",
    disclaimer: "Not financial advice."
  },
  {
    id: "3",
    timestamp: new Date("2025-12-13T09:00:00"),
    pair: "NAS100",
    timeframe: "M15",
    style: "Scalping",
    imageUrl: "",
    trend: "Sideways",
    bias: "No Trade",
    probability: 45,
    riskScore: 8,
    supportLevels: ["16800", "16750"],
    resistanceLevels: ["16900", "16950"],
    marketStructure: "Consolidation",
    detectedPatterns: ["Doji", "Inside Bar"],
    supplyDemandZones: [],
    possibleOutcomes: ["Wait for breakout"],
    stopLoss: "-",
    takeProfit: "-",
    reasoning: "No clear direction",
    disclaimer: "Not financial advice."
  },
];

const getBiasIcon = (bias: Bias) => {
  switch (bias) {
    case "Buy":
      return <TrendingUp className="h-4 w-4" />;
    case "Sell":
      return <TrendingDown className="h-4 w-4" />;
    default:
      return <Minus className="h-4 w-4" />;
  }
};

const getBiasVariant = (bias: Bias): "buy" | "sell" | "neutral" => {
  switch (bias) {
    case "Buy":
      return "buy";
    case "Sell":
      return "sell";
    default:
      return "neutral";
  }
};

export default function History() {
  const [filterPair, setFilterPair] = useState<string>("all");
  const [filterBias, setFilterBias] = useState<string>("all");

  const filteredHistory = mockHistory.filter(item => {
    if (filterPair !== "all" && item.pair !== filterPair) return false;
    if (filterBias !== "all" && item.bias !== filterBias) return false;
    return true;
  });

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container px-4 py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Analysis History</h1>
            <p className="text-muted-foreground">View your past chart analyses</p>
          </div>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export All
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Filters:</span>
          </div>
          <Select value={filterPair} onValueChange={setFilterPair}>
            <SelectTrigger className="w-[140px] glass-card">
              <SelectValue placeholder="All Pairs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Pairs</SelectItem>
              <SelectItem value="EUR/USD">EUR/USD</SelectItem>
              <SelectItem value="XAU/USD">XAU/USD</SelectItem>
              <SelectItem value="NAS100">NAS100</SelectItem>
              <SelectItem value="GBP/USD">GBP/USD</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterBias} onValueChange={setFilterBias}>
            <SelectTrigger className="w-[140px] glass-card">
              <SelectValue placeholder="All Signals" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Signals</SelectItem>
              <SelectItem value="Buy">Buy</SelectItem>
              <SelectItem value="Sell">Sell</SelectItem>
              <SelectItem value="No Trade">No Trade</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* History List */}
        {filteredHistory.length > 0 ? (
          <div className="space-y-4">
            {filteredHistory.map((item) => (
              <Card key={item.id} className="glass-card hover:border-primary/30 transition-colors cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* Left: Date & Time */}
                    <div className="flex items-center gap-3 sm:min-w-[140px]">
                      <div className="h-10 w-10 rounded-lg bg-secondary/50 flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{formatDate(item.timestamp)}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(item.timestamp)}
                        </p>
                      </div>
                    </div>

                    {/* Middle: Pair & Config */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{item.pair}</span>
                        <Badge variant="outline" className="text-xs">{item.timeframe}</Badge>
                        <Badge variant="secondary" className="text-xs">{item.style}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {item.detectedPatterns.join(", ") || "No patterns"}
                      </p>
                    </div>

                    {/* Right: Signal & Probability */}
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-2xl font-bold gradient-text">{item.probability}%</p>
                        <p className="text-xs text-muted-foreground">Probability</p>
                      </div>
                      <Badge variant={getBiasVariant(item.bias)} className="gap-1 min-w-[80px] justify-center">
                        {getBiasIcon(item.bias)}
                        {item.bias}
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
                {filterPair !== "all" || filterBias !== "all" 
                  ? "Try adjusting your filters" 
                  : "Start analyzing charts to build your history"}
              </p>
              <Button variant="default" onClick={() => window.location.href = "/"}>
                Analyze a Chart
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
