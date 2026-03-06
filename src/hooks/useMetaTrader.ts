import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AccountInfo {
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  leverage: number;
  currency: string;
  server: string;
  platform: string;
}

export function useMetaTrader() {
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const { toast } = useToast();

  const getAccountInfo = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('execute-metatrader-trade', {
        body: { action: 'get-account-info' },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      setAccountInfo(data.account);
      setConnected(true);
      return data.account;
    } catch (err: any) {
      setConnected(false);
      toast({
        title: 'MT Connection Failed',
        description: err.message || 'Could not connect to MetaTrader account.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const executeLiveTrade = useCallback(async (params: {
    symbol: string;
    direction: 'BUY' | 'SELL';
    volume: number;
    stopLoss?: number;
    takeProfit?: number;
  }) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('execute-metatrader-trade', {
        body: { action: 'execute-trade', ...params },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({
        title: 'Live Trade Executed',
        description: `${params.direction} ${params.symbol} @ ${params.volume} lots — Order: ${data.orderId}`,
      });
      return { success: true, data };
    } catch (err: any) {
      toast({
        title: 'Trade Execution Failed',
        description: err.message || 'Failed to execute on MetaTrader.',
        variant: 'destructive',
      });
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const getPositions = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('execute-metatrader-trade', {
        body: { action: 'get-positions' },
      });
      if (error) throw error;
      return data.positions || [];
    } catch {
      return [];
    }
  }, []);

  return {
    accountInfo,
    connected,
    loading,
    getAccountInfo,
    executeLiveTrade,
    getPositions,
  };
}
