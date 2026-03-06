
CREATE TABLE public.metatrader_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  account_id text NOT NULL DEFAULT '',
  api_token text NOT NULL DEFAULT '',
  server_region text NOT NULL DEFAULT 'new-york',
  is_connected boolean NOT NULL DEFAULT false,
  platform text NOT NULL DEFAULT 'mt5',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.metatrader_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own mt settings" ON public.metatrader_settings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own mt settings" ON public.metatrader_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own mt settings" ON public.metatrader_settings FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_metatrader_settings_updated_at BEFORE UPDATE ON public.metatrader_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
