import { useState, useCallback } from 'react';
import { getToken, getApiUrl } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

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
      const data = await callMetaTraderAPI({ action: 'get-account-info' });
      if (data.error) throw new Error(data.error);
      setAccountInfo(data.account);
      setConnected(true);
      return data.account;
    } catch (err: any) {
      setConnected(false);
      const msg = err.message || '';
      if (!msg.includes('not configured') && !msg.includes('Not configured')) {
        toast({ title: 'MT Connection Failed', description: msg || 'Could not connect to MetaTrader account.', variant: 'destructive' });
      }
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
      const data = await callMetaTraderAPI({ action: 'execute-trade', ...params });
      if (data.error) throw new Error(data.error);
      toast({ title: 'Live Trade Executed', description: `${params.direction} ${params.symbol} @ ${params.volume} lots — Order: ${data.orderId}` });
      return { success: true, data };
    } catch (err: any) {
      toast({ title: 'Trade Execution Failed', description: err.message || 'Failed to execute on MetaTrader.', variant: 'destructive' });
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const getPositions = useCallback(async () => {
    try {
      const data = await callMetaTraderAPI({ action: 'get-positions' });
      return data.positions || [];
    } catch {
      return [];
    }
  }, []);

  return { accountInfo, connected, loading, getAccountInfo, executeLiveTrade, getPositions };
}
