import { useState, useEffect, useCallback } from 'react';
import { api, getToken, getApiUrl } from '@/lib/api';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

async function callMetaTraderAPI(body: object) {
  const token = await getToken();
  const response = await fetch(getApiUrl('/api/metatrader/trade'), {
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
  login: string;
  server: string;
  has_password: boolean;
  is_connected: boolean;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Request failed";
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
      setSettings(data as MetaTraderConfig | null);
    } catch (err) {
      console.error('Error fetching MT settings:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const saveSettings = async (config: { login: string; password?: string; server: string }) => {
    if (!user) {
      toast({ title: 'Save Failed', description: 'Sign in before saving MT5 credentials.', variant: 'destructive' });
      return false;
    }
    setSaving(true);
    try {
      await api.metatrader.saveSettings(config);
      await fetchSettings();
      toast({ title: 'Settings Saved', description: 'MetaTrader configuration updated.' });
      return true;
    } catch (err: unknown) {
      toast({ title: 'Save Failed', description: getErrorMessage(err), variant: 'destructive' });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    if (!user) {
      toast({ title: 'Connection Failed', description: 'Sign in before testing the MT5 connection.', variant: 'destructive' });
      return false;
    }
    try {
      const data = await callMetaTraderAPI({ action: 'get-account-info' });
      if (data?.error) throw new Error(data.error);

      await fetchSettings();
      toast({ title: 'Connection Successful', description: `Connected to MetaTrader 5 — Balance: $${data.account?.balance?.toFixed(2)}` });
      return true;
    } catch (err: unknown) {
      await fetchSettings();
      toast({ title: 'Connection Failed', description: getErrorMessage(err), variant: 'destructive' });
      return false;
    }
  };

  return { settings, loading, saving, saveSettings, testConnection };
}
