export type SubscriptionTier = 'free' | 'premium' | 'pro';

export type AutomationMode = 'manual' | 'assisted' | 'auto';

export type TradeDirection = 'BUY' | 'SELL' | 'WAIT';

export type TradeStatus = 'open' | 'closed' | 'cancelled';

export type TradeOutcome = 'pending' | 'win' | 'loss' | 'breakeven';

export interface RiskSettings {
  id: string;
  user_id: string;
  risk_per_trade: number;
  max_trades_per_day: number;
  max_daily_loss: number;
  daily_profit_lock: number;
  confidence_threshold: number;
  automation_mode: AutomationMode;
  circuit_breaker_enabled: boolean;
  news_filter_enabled: boolean;
  kill_switch_active: boolean;
}

export interface Trade {
  id: string;
  user_id: string;
  analysis_id: string | null;
  pair: string;
  direction: string;
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  lot_size: number;
  status: TradeStatus;
  outcome: TradeOutcome;
  pnl: number;
  execution_mode: string;
  risk_reward: number | null;
  confidence: number | null;
  opened_at: string;
  closed_at: string | null;
  notes: string | null;
}

export interface RiskConsent {
  id: string;
  user_id: string;
  consent_text: string;
  consented_at: string;
}

export interface DashboardMetrics {
  totalTrades: number;
  winRate: number;
  totalPnl: number;
  maxDrawdown: number;
  avgConfidence: number;
  avgRiskReward: number;
  bestPair: string;
  tradesByDay: { date: string; pnl: number; cumulative: number }[];
  winLossData: { wins: number; losses: number; breakeven: number };
  confidenceAccuracy: { confidence: number; actualWinRate: number }[];
}

export const RISK_CONSENT_TEXT = 
  "I understand that trading involves significant risk of loss. AI-generated signals are probability-based analysis tools and do not guarantee profits. I accept full responsibility for my trading decisions and understand that Apexium is not liable for any financial losses incurred. Past performance does not indicate future results.";

export const TIER_FEATURES: Record<SubscriptionTier, {
  name: string;
  analyses: string;
  automation: AutomationMode[];
  advancedRisk: boolean;
  price: string;
}> = {
  free: {
    name: 'Free',
    analyses: '10/day',
    automation: ['manual'],
    advancedRisk: false,
    price: '$0',
  },
  premium: {
    name: 'Premium',
    analyses: 'Unlimited',
    automation: ['manual', 'assisted'],
    advancedRisk: true,
    price: '$9.99/mo',
  },
  pro: {
    name: 'Pro',
    analyses: 'Unlimited',
    automation: ['manual', 'assisted', 'auto'],
    advancedRisk: true,
    price: '$29.99/mo',
  },
};
