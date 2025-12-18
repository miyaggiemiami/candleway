-- Create analyses table to store user analysis history
CREATE TABLE public.analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pair TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  style TEXT NOT NULL,
  image_url TEXT,
  trend TEXT NOT NULL,
  bias TEXT NOT NULL,
  probability INTEGER NOT NULL,
  risk_score INTEGER NOT NULL,
  support_levels TEXT[] DEFAULT '{}',
  resistance_levels TEXT[] DEFAULT '{}',
  market_structure TEXT,
  detected_patterns TEXT[] DEFAULT '{}',
  supply_demand_zones TEXT[] DEFAULT '{}',
  possible_outcomes TEXT[] DEFAULT '{}',
  stop_loss TEXT,
  take_profit TEXT,
  reasoning TEXT,
  disclaimer TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on analyses
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;

-- Users can only view their own analyses
CREATE POLICY "Users can view own analyses"
ON public.analyses
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own analyses
CREATE POLICY "Users can insert own analyses"
ON public.analyses
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own analyses
CREATE POLICY "Users can delete own analyses"
ON public.analyses
FOR DELETE
USING (auth.uid() = user_id);

-- Add display_name column to profiles if not exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name TEXT;