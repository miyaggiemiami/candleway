export type TradingPair = 
  | "EUR/USD" | "GBP/USD" | "USD/JPY" | "USD/CHF" | "AUD/USD" | "NZD/USD"
  | "XAU/USD" | "XAG/USD"
  | "NAS100" | "US30" | "US500" | "GER40"
  | "BTC/USD" | "ETH/USD" | "BNB/USD" | "SOL/USD";

export type Timeframe = "M1" | "M5" | "M15" | "M30" | "H1" | "H4" | "D1" | "W1";

export type TradingStyle = "Scalping" | "Day Trading" | "Swing Trading" | "Long-Term";

export type Bias = "Buy" | "Sell" | "No Trade";

export type Trend = "Uptrend" | "Downtrend" | "Sideways";

export interface AnalysisResult {
  id: string;
  timestamp: Date;
  pair: TradingPair;
  timeframe: Timeframe;
  style: TradingStyle;
  imageUrl: string;
  trend: Trend;
  bias: Bias;
  probability: number;
  riskScore: number;
  supportLevels: string[];
  resistanceLevels: string[];
  marketStructure: string;
  detectedPatterns: string[];
  supplyDemandZones: string[];
  possibleOutcomes: string[];
  stopLoss: string;
  takeProfit: string;
  reasoning: string;
  disclaimer: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  isPremium: boolean;
  dailyAnalysesUsed: number;
  dailyAnalysesLimit: number;
  analysisHistory: AnalysisResult[];
  preferences: {
    defaultPair: TradingPair;
    defaultTimeframe: Timeframe;
    defaultStyle: TradingStyle;
  };
}

export const TRADING_PAIRS: TradingPair[] = [
  "EUR/USD", "GBP/USD", "USD/JPY", "USD/CHF", "AUD/USD", "NZD/USD",
  "XAU/USD", "XAG/USD",
  "NAS100", "US30", "US500", "GER40",
  "BTC/USD", "ETH/USD", "BNB/USD", "SOL/USD"
];

export const TIMEFRAMES: Timeframe[] = ["M1", "M5", "M15", "M30", "H1", "H4", "D1", "W1"];

export const TRADING_STYLES: TradingStyle[] = ["Scalping", "Day Trading", "Swing Trading", "Long-Term"];
