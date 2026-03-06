import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

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
      const { data, error } = await supabase.functions.invoke('execute-metatrader-trade', {
        body: { action: 'get-account-info' },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);

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
