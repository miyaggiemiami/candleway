ALTER TABLE public.metatrader_settings
  ADD COLUMN mt5_login text NOT NULL DEFAULT '',
  ADD COLUMN mt5_password_encrypted text NOT NULL DEFAULT '',
  ADD COLUMN mt5_server text NOT NULL DEFAULT '';
