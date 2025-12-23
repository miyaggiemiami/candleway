import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TrendingUp, TrendingDown, Target, Shield, BarChart3, Brain, AlertTriangle } from "lucide-react";
import { Bias, Trend } from "@/types/analysis";

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

interface AnalysisDetailDialogProps {
  analysis: AnalysisRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AnalysisDetailDialog({ analysis, open, onOpenChange }: AnalysisDetailDialogProps) {
  if (!analysis) return null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getBiasColor = (bias: string) => {
    if (bias === "Buy") return "text-chart-up";
    if (bias === "Sell") return "text-chart-down";
    return "text-chart-neutral";
  };

  const getRiskLevel = (score: number) => {
    if (score <= 3) return { label: "Low Risk", color: "text-chart-up" };
    if (score <= 6) return { label: "Medium Risk", color: "text-yellow-500" };
    return { label: "High Risk", color: "text-chart-down" };
  };

  const risk = getRiskLevel(analysis.risk_score);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        <ScrollArea className="max-h-[90vh]">
          <div className="p-6 space-y-6">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-2xl font-bold">{analysis.pair} Analysis</DialogTitle>
                  <p className="text-sm text-muted-foreground mt-1">{formatDate(analysis.created_at)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{analysis.timeframe}</Badge>
                  <Badge variant="secondary">{analysis.style}</Badge>
                </div>
              </div>
            </DialogHeader>

            {/* Primary Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="glass-card">
                <CardContent className="p-4 text-center">
                  <div className={`text-3xl font-bold ${getBiasColor(analysis.bias)}`}>
                    {analysis.probability}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Probability</p>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardContent className="p-4 text-center">
                  <Badge 
                    variant={analysis.bias === "Buy" ? "buy" : analysis.bias === "Sell" ? "sell" : "neutral"}
                    className="text-lg px-4 py-1"
                  >
                    {analysis.bias}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-2">Signal</p>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardContent className="p-4 text-center">
                  <div className={`text-2xl font-bold ${risk.color}`}>
                    {analysis.risk_score}/10
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{risk.label}</p>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    <span className="font-semibold">{analysis.trend}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Trend</p>
                </CardContent>
              </Card>
            </div>

            {/* Chart Image */}
            {analysis.image_url && (
              <Card className="glass-card overflow-hidden">
                <CardContent className="p-0">
                  <img 
                    src={analysis.image_url} 
                    alt="Chart" 
                    className="w-full h-auto max-h-64 object-contain bg-background/50"
                  />
                </CardContent>
              </Card>
            )}

            {/* Stop Loss & Take Profit */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="glass-card border-red-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-4 w-4 text-red-400" />
                    <span className="text-sm font-medium text-red-400">Stop Loss</span>
                  </div>
                  <p className="text-lg font-bold">{analysis.stop_loss || "-"}</p>
                </CardContent>
              </Card>
              <Card className="glass-card border-emerald-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-emerald-400" />
                    <span className="text-sm font-medium text-emerald-400">Take Profit</span>
                  </div>
                  <p className="text-lg font-bold">{analysis.take_profit || "-"}</p>
                </CardContent>
              </Card>
            </div>

            {/* Support & Resistance Levels */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="glass-card border-chart-up/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingDown className="h-4 w-4 text-chart-up" />
                    <span className="font-medium">Support Levels</span>
                  </div>
                  <div className="space-y-2">
                    {(analysis.support_levels || []).length > 0 ? (
                      analysis.support_levels.map((level, index) => (
                        <div key={index} className="px-3 py-2 rounded-lg bg-chart-up/10 font-mono text-sm text-chart-up">
                          {level}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No support levels identified</p>
                    )}
                  </div>
                </CardContent>
              </Card>
              <Card className="glass-card border-chart-down/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="h-4 w-4 text-chart-down" />
                    <span className="font-medium">Resistance Levels</span>
                  </div>
                  <div className="space-y-2">
                    {(analysis.resistance_levels || []).length > 0 ? (
                      analysis.resistance_levels.map((level, index) => (
                        <div key={index} className="px-3 py-2 rounded-lg bg-chart-down/10 font-mono text-sm text-chart-down">
                          {level}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No resistance levels identified</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Market Structure */}
            {analysis.market_structure && (
              <Card className="glass-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    <span className="font-medium">Market Structure</span>
                  </div>
                  <p className="text-muted-foreground">{analysis.market_structure}</p>
                </CardContent>
              </Card>
            )}

            {/* Detected Patterns */}
            {analysis.detected_patterns && analysis.detected_patterns.length > 0 && (
              <Card className="glass-card">
                <CardContent className="p-4">
                  <h4 className="font-medium mb-3">Detected Patterns</h4>
                  <div className="flex flex-wrap gap-2">
                    {analysis.detected_patterns.map((pattern, index) => (
                      <Badge key={index} variant="secondary">
                        {pattern}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Supply & Demand Zones */}
            {analysis.supply_demand_zones && analysis.supply_demand_zones.length > 0 && (
              <Card className="glass-card">
                <CardContent className="p-4">
                  <h4 className="font-medium mb-3">Supply & Demand Zones</h4>
                  <div className="flex flex-wrap gap-2">
                    {analysis.supply_demand_zones.map((zone, index) => (
                      <Badge key={index} variant="outline" className="bg-primary/10">
                        {zone}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Possible Outcomes */}
            {analysis.possible_outcomes && analysis.possible_outcomes.length > 0 && (
              <Card className="glass-card">
                <CardContent className="p-4">
                  <h4 className="font-medium mb-3">Possible Outcomes</h4>
                  <ul className="space-y-2">
                    {analysis.possible_outcomes.map((outcome, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="text-primary mt-1">•</span>
                        {outcome}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* AI Reasoning */}
            {analysis.reasoning && (
              <Card className="glass-card border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Brain className="h-4 w-4 text-primary" />
                    <span className="font-medium">AI Reasoning</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {analysis.reasoning}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Disclaimer */}
            <Card className="glass-card border-yellow-500/20 bg-yellow-500/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    This analysis is for educational purposes only and does not constitute financial advice. 
                    Always do your own research and manage risk appropriately.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
