import { useMemo, useState } from "react";
import type { AnalysisResult } from "@/types/analysis";
import { ChartAnalysisContext, type ChatAnalysisContext } from "./useChartAnalysisContext";

export function ChartAnalysisProvider({ children }: { children: React.ReactNode }) {
  const [analysisContext, setAnalysisContext] = useState<ChatAnalysisContext | null>(null);

  const value = useMemo(() => ({
    analysisContext,
    setLatestAnalysis: (analysis: AnalysisResult) => {
      const {
        pair, timeframe, style, trend, bias, probability, riskScore,
        supportLevels, resistanceLevels, marketStructure, detectedPatterns,
        supplyDemandZones, possibleOutcomes, stopLoss, takeProfit, reasoning,
      } = analysis;
      setAnalysisContext({
        pair, timeframe, style, trend, bias, probability, riskScore,
        supportLevels, resistanceLevels, marketStructure, detectedPatterns,
        supplyDemandZones, possibleOutcomes, stopLoss, takeProfit, reasoning,
      });
    },
  }), [analysisContext]);

  return <ChartAnalysisContext.Provider value={value}>{children}</ChartAnalysisContext.Provider>;
}
