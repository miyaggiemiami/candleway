import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from './useAuth';
import { Trade, DashboardMetrics } from '@/types/trading';

export function useTrades() {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrades = useCallback(async () => {
    if (!user) return;
    try {
      const data = await api.trades.list();
      setTrades(data as unknown as Trade[]);
    } catch (err) {
      console.error('Error fetching trades:', err);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchTrades();
  }, [fetchTrades]);

  const openTrade = async (trade: Omit<Trade, 'id' | 'user_id' | 'status' | 'outcome' | 'pnl' | 'opened_at' | 'closed_at' | 'notes'>) => {
    if (!user) return { error: new Error('Not authenticated') };
    try {
      const data = await api.trades.create(trade as any);
      await fetchTrades();
      return { data: data as unknown as Trade, error: null };
    } catch (err: any) {
      return { data: null, error: new Error(err.message) };
    }
  };

  const closeTrade = async (tradeId: string, outcome: 'win' | 'loss' | 'breakeven', pnl: number) => {
    try {
      await api.trades.update(tradeId, {
        status: 'closed',
        outcome,
        pnl,
        closed_at: new Date().toISOString(),
      });
      await fetchTrades();
      return { error: null };
    } catch (err: any) {
      return { error: new Error(err.message) };
    }
  };

  const cancelTrade = async (tradeId: string) => {
    try {
      await api.trades.update(tradeId, {
        status: 'cancelled',
        outcome: 'breakeven',
        closed_at: new Date().toISOString(),
      });
      await fetchTrades();
      return { error: null };
    } catch (err: any) {
      return { error: new Error(err.message) };
    }
  };

  const getMetrics = useCallback((): DashboardMetrics => {
    const closedTrades = trades.filter(t => t.status === 'closed');
    const wins = closedTrades.filter(t => t.outcome === 'win');
    const losses = closedTrades.filter(t => t.outcome === 'loss');
    const breakevens = closedTrades.filter(t => t.outcome === 'breakeven');

    const winRate = closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : 0;
    const totalPnl = closedTrades.reduce((sum, t) => sum + Number(t.pnl || 0), 0);

    let peak = 0;
    let maxDrawdown = 0;
    let cumPnl = 0;
    const sortedTrades = [...closedTrades].sort((a, b) =>
      new Date(a.opened_at).getTime() - new Date(b.opened_at).getTime()
    );

    const tradesByDay: { date: string; pnl: number; cumulative: number }[] = [];

    sortedTrades.forEach(t => {
      cumPnl += Number(t.pnl || 0);
      if (cumPnl > peak) peak = cumPnl;
      const dd = peak - cumPnl;
      if (dd > maxDrawdown) maxDrawdown = dd;
      const date = new Date(t.opened_at).toLocaleDateString();
      tradesByDay.push({ date, pnl: Number(t.pnl || 0), cumulative: cumPnl });
    });

    const pairPnl: Record<string, number> = {};
    closedTrades.forEach(t => {
      pairPnl[t.pair] = (pairPnl[t.pair] || 0) + Number(t.pnl || 0);
    });
    const bestPair = Object.entries(pairPnl).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';

    const tradesWithConfidence = closedTrades.filter(t => t.confidence != null);
    const avgConfidence = tradesWithConfidence.length > 0
      ? tradesWithConfidence.reduce((sum, t) => sum + (t.confidence || 0), 0) / tradesWithConfidence.length
      : 0;

    const tradesWithRR = closedTrades.filter(t => t.risk_reward != null);
    const avgRiskReward = tradesWithRR.length > 0
      ? tradesWithRR.reduce((sum, t) => sum + Number(t.risk_reward || 0), 0) / tradesWithRR.length
      : 0;

    const confidenceBuckets: Record<number, { total: number; wins: number }> = {};
    closedTrades.forEach(t => {
      if (t.confidence == null) return;
      const bucket = Math.floor(t.confidence / 10) * 10;
      if (!confidenceBuckets[bucket]) confidenceBuckets[bucket] = { total: 0, wins: 0 };
      confidenceBuckets[bucket].total++;
      if (t.outcome === 'win') confidenceBuckets[bucket].wins++;
    });
    const confidenceAccuracy = Object.entries(confidenceBuckets).map(([conf, data]) => ({
      confidence: Number(conf),
      actualWinRate: data.total > 0 ? (data.wins / data.total) * 100 : 0,
    }));

    return {
      totalTrades: closedTrades.length,
      winRate,
      totalPnl,
      maxDrawdown,
      avgConfidence,
      avgRiskReward,
      bestPair,
      tradesByDay,
      winLossData: { wins: wins.length, losses: losses.length, breakeven: breakevens.length },
      confidenceAccuracy,
    };
  }, [trades]);

  const getTodayStats = useCallback(() => {
    const today = new Date().toDateString();
    const todayTrades = trades.filter(t => new Date(t.opened_at).toDateString() === today);
    const todayClosedTrades = todayTrades.filter(t => t.status === 'closed');
    const todayPnl = todayClosedTrades.reduce((sum, t) => sum + Number(t.pnl || 0), 0);
    const todayLosses = todayClosedTrades.filter(t => t.outcome === 'loss').length;

    return {
      count: todayTrades.length,
      pnl: todayPnl,
      losses: todayLosses,
      openCount: todayTrades.filter(t => t.status === 'open').length,
    };
  }, [trades]);

  return { trades, loading, openTrade, closeTrade, cancelTrade, getMetrics, getTodayStats, refetch: fetchTrades };
}
