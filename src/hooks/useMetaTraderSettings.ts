import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

async function callMetaTraderAPI(body: object) {
  return api.metatrader.trade(body);
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
    try {
      const data = await api.metatrader.getSettings();
      setSettings(data as unknown as MetaTraderConfig);
    } catch (err) {
      console.error('Error fetching MT settings:', err);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const saveSettings = async (config: { account_id: string; api_token: string; server_region: string; platform: string }) => {
    if (!user) return;
    setSaving(true);
    try {
      await api.metatrader.saveSettings(config);
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

      await api.metatrader.saveSettings({ ...settings, is_connected: true } as any);
      await fetchSettings();

      toast({ title: 'Connection Successful', description: `Connected to ${data.account?.platform || 'MetaTrader'} — Balance: $${data.account?.balance?.toFixed(2)}` });
      return true;
    } catch (err: any) {
      await api.metatrader.saveSettings({ ...settings, is_connected: false } as any).catch(() => {});
      await fetchSettings();
      toast({ title: 'Connection Failed', description: err.message, variant: 'destructive' });
      return false;
    }
  };

  return { settings, loading, saving, saveSettings, testConnection };
}
