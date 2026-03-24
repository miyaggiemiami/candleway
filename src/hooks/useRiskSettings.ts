import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from './useAuth';
import { RiskSettings } from '@/types/trading';

export function useRiskSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<RiskSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    if (!user) return;
    try {
      const data = await api.riskSettings.get();
      setSettings(data as unknown as RiskSettings);
    } catch (err) {
      console.error('Error fetching risk settings:', err);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = async (updates: Partial<RiskSettings>) => {
    if (!user || !settings) return;
    try {
      const data = await api.riskSettings.update(updates as any);
      setSettings(data as unknown as RiskSettings);
      return { error: null };
    } catch (err: any) {
      return { error: new Error(err.message) };
    }
  };

  return { settings, loading, updateSettings, refetch: fetchSettings };
}
