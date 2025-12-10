import { AnalysisResult as AnalysisResultType } from "@/types/analysis";
import { ProbabilityGauge } from "./ProbabilityGauge";
import { BiasDisplay } from "./BiasDisplay";
import { RiskMeter } from "./RiskMeter";
import { LevelCard } from "./LevelCard";
import { PatternList } from "./PatternList";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Download, 
  Share2, 
  RefreshCw, 
  AlertTriangle, 
  BarChart3,
  BookOpen
} from "lucide-react";

interface AnalysisResultProps {
  result: AnalysisResultType;
  onAnalyzeAnother: () => void;
}

export function AnalysisResultDisplay({ result, onAnalyzeAnother }: AnalysisResultProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Analysis Complete</h2>
          <p className="text-sm text-muted-foreground">
            {result.pair} • {result.timeframe} • {result.style}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        </div>
      </div>

      {/* Main Analysis Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column - Primary Metrics */}
        <div className="space-y-6">
          {/* Probability & Bias */}
          <div className="glass-card-glow p-6">
            <div className="grid sm:grid-cols-2 gap-6 items-center">
              <ProbabilityGauge probability={result.probability} bias={result.bias} />
              <BiasDisplay bias={result.bias} trend={result.trend} />
            </div>
          </div>

          {/* Risk Score */}
          <RiskMeter riskScore={result.riskScore} />

          {/* SL/TP Levels */}
          <div className="grid sm:grid-cols-2 gap-4">
            <LevelCard type="sl" levels={[result.stopLoss]} />
            <LevelCard type="tp" levels={[result.takeProfit]} />
          </div>
        </div>

        {/* Right Column - Details */}
        <div className="space-y-6">
          {/* Chart Preview */}
          <div className="glass-card overflow-hidden">
            <img
              src={result.imageUrl}
              alt="Analyzed chart"
              className="w-full aspect-video object-contain bg-background/50"
            />
          </div>

          {/* Support & Resistance */}
          <div className="grid sm:grid-cols-2 gap-4">
            <LevelCard type="support" levels={result.supportLevels} />
            <LevelCard type="resistance" levels={result.resistanceLevels} />
          </div>

          {/* Market Structure */}
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Market Structure</span>
            </div>
            <p className="text-sm text-muted-foreground">{result.marketStructure}</p>
          </div>
        </div>
      </div>

      {/* Patterns & Zones */}
      <div className="grid gap-4 md:grid-cols-3">
        <PatternList 
          title="Detected Patterns" 
          patterns={result.detectedPatterns} 
          variant="default"
        />
        <PatternList 
          title="Supply/Demand Zones" 
          patterns={result.supplyDemandZones}
          variant="success"
        />
        <PatternList 
          title="Possible Outcomes" 
          patterns={result.possibleOutcomes}
          variant="warning"
        />
      </div>

      {/* Reasoning */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">AI Reasoning</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {result.reasoning}
        </p>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-warning/10 border border-warning/30">
        <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
        <p className="text-sm text-warning">
          {result.disclaimer}
        </p>
      </div>

      {/* Analyze Another */}
      <Button
        onClick={onAnalyzeAnother}
        size="lg"
        className="w-full"
      >
        <RefreshCw className="h-5 w-5" />
        Analyze Another Chart
      </Button>
    </div>
  );
}
