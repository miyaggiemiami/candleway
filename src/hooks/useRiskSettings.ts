import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { RiskSettings, AutomationMode } from '@/types/trading';

const DEFAULT_SETTINGS: Omit<RiskSettings, 'id' | 'user_id'> = {
  risk_per_trade: 1.0,
  max_trades_per_day: 5,
  max_daily_loss: 5.0,
  daily_profit_lock: 0,
  confidence_threshold: 70,
  automation_mode: 'manual',
  circuit_breaker_enabled: true,
  news_filter_enabled: false,
  kill_switch_active: false,
};

export function useRiskSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<RiskSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('risk_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching risk settings:', error);
      setLoading(false);
      return;
    }

    if (!data) {
      // Create default settings
      const { data: newData, error: insertError } = await supabase
        .from('risk_settings')
        .insert({ user_id: user.id, ...DEFAULT_SETTINGS })
        .select()
        .single();

      if (!insertError && newData) {
        setSettings(newData as unknown as RiskSettings);
      }
    } else {
      setSettings(data as unknown as RiskSettings);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = async (updates: Partial<RiskSettings>) => {
    if (!user || !settings) return;
    
    const { error } = await supabase
      .from('risk_settings')
      .update(updates as any)
      .eq('user_id', user.id);

    if (!error) {
      setSettings({ ...settings, ...updates });
    }
    return { error };
  };

  return { settings, loading, updateSettings, refetch: fetchSettings };
}
