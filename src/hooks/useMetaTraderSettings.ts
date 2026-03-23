import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

async function callMetaTraderAPI(body: object) {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;
  const response = await fetch('/api/execute-metatrader-trade', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export interface MetaTraderConfig {
  id: string;
  user_id: string;
  account_id: string;
  api_token: string;
  server_region: string;
  is_connected: boolean;
  platform: string;
}

export function useMetaTraderSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<MetaTraderConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchSettings = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const { data, error } = await supabase
      .from('metatrader_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!error && data) {
      setSettings(data as unknown as MetaTraderConfig);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const saveSettings = async (config: { account_id: string; api_token: string; server_region: string; platform: string }) => {
    if (!user) return;
    setSaving(true);
    try {
      if (settings) {
        const { error } = await supabase
          .from('metatrader_settings')
          .update({ ...config } as any)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('metatrader_settings')
          .insert({ user_id: user.id, ...config } as any);
        if (error) throw error;
      }
      await fetchSettings();
      toast({ title: 'Settings Saved', description: 'MetaTrader configuration updated.' });
    } catch (err: any) {
      toast({ title: 'Save Failed', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    if (!user) return false;
    try {
      const data = await callMetaTraderAPI({ action: 'get-account-info' });
      if (data?.error) throw new Error(data.error);

      await supabase
        .from('metatrader_settings')
        .update({ is_connected: true } as any)
        .eq('user_id', user.id);
      await fetchSettings();
      
      toast({ title: 'Connection Successful', description: `Connected to ${data.account?.platform || 'MetaTrader'} — Balance: $${data.account?.balance?.toFixed(2)}` });
      return true;
    } catch (err: any) {
      await supabase
        .from('metatrader_settings')
        .update({ is_connected: false } as any)
        .eq('user_id', user.id);
      await fetchSettings();
      
      toast({ title: 'Connection Failed', description: err.message, variant: 'destructive' });
      return false;
    }
  };

  return { settings, loading, saving, saveSettings, testConnection };
}
