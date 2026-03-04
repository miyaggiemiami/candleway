
-- Risk settings per user
CREATE TABLE public.risk_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  risk_per_trade numeric(5,2) NOT NULL DEFAULT 1.0,
  max_trades_per_day integer NOT NULL DEFAULT 5,
  max_daily_loss numeric(5,2) NOT NULL DEFAULT 5.0,
  daily_profit_lock numeric(5,2) NOT NULL DEFAULT 0,
  confidence_threshold integer NOT NULL DEFAULT 70,
  automation_mode text NOT NULL DEFAULT 'manual',
  circuit_breaker_enabled boolean NOT NULL DEFAULT true,
  news_filter_enabled boolean NOT NULL DEFAULT false,
  kill_switch_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Paper trades log
CREATE TABLE public.trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  analysis_id uuid REFERENCES public.analyses(id) ON DELETE SET NULL,
  pair text NOT NULL,
  direction text NOT NULL,
  entry_price numeric(20,8) NOT NULL,
  stop_loss numeric(20,8) NOT NULL,
  take_profit numeric(20,8) NOT NULL,
  lot_size numeric(10,4) NOT NULL DEFAULT 0.01,
  status text NOT NULL DEFAULT 'open',
  outcome text DEFAULT 'pending',
  pnl numeric(20,2) DEFAULT 0,
  execution_mode text NOT NULL DEFAULT 'manual',
  risk_reward numeric(5,2),
  confidence integer,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  notes text
);

-- Risk consent storage
CREATE TABLE public.risk_consent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  consent_text text NOT NULL,
  consented_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Add subscription_tier to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_tier text NOT NULL DEFAULT 'free';

-- RLS for risk_settings
ALTER TABLE public.risk_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own risk settings" ON public.risk_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own risk settings" ON public.risk_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own risk settings" ON public.risk_settings FOR UPDATE USING (auth.uid() = user_id);

-- RLS for trades
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own trades" ON public.trades FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own trades" ON public.trades FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own trades" ON public.trades FOR UPDATE USING (auth.uid() = user_id);

-- RLS for risk_consent
ALTER TABLE public.risk_consent ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own consent" ON public.risk_consent FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own consent" ON public.risk_consent FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Enable realtime for trades
ALTER PUBLICATION supabase_realtime ADD TABLE public.trades;

-- Trigger for risk_settings updated_at
CREATE TRIGGER update_risk_settings_updated_at
  BEFORE UPDATE ON public.risk_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
