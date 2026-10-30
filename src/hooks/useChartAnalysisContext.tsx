import { createContext, useContext } from "react";
import type { AnalysisResult } from "@/types/analysis";

export type ChatAnalysisContext = Pick<
  AnalysisResult,
  | "pair"
  | "timeframe"
  | "style"
  | "trend"
  | "bias"
  | "probability"
  | "riskScore"
  | "supportLevels"
  | "resistanceLevels"
  | "marketStructure"
  | "detectedPatterns"
  | "supplyDemandZones"
  | "possibleOutcomes"
  | "stopLoss"
  | "takeProfit"
  | "reasoning"
>;

interface ChartAnalysisContextValue {
  analysisContext: ChatAnalysisContext | null;
  setLatestAnalysis: (analysis: AnalysisResult) => void;
}

export const ChartAnalysisContext = createContext<ChartAnalysisContextValue | null>(null);

export function useChartAnalysisContext() {
  const context = useContext(ChartAnalysisContext);
  if (!context) throw new Error("useChartAnalysisContext must be used within ChartAnalysisProvider");
  return context;
}
