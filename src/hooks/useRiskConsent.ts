import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from './useAuth';
import { RISK_CONSENT_TEXT } from '@/types/trading';

export function useRiskConsent() {
  const { user } = useAuth();
  const [hasConsented, setHasConsented] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkConsent = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      const data = await api.riskConsent.check();
      setHasConsented(!!data.hasConsented);
    } catch (err) {
      console.error('Error checking consent:', err);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    checkConsent();
  }, [checkConsent]);

  const giveConsent = async () => {
    if (!user) return { error: new Error('Not authenticated') };
    try {
      await api.riskConsent.give(RISK_CONSENT_TEXT);
      setHasConsented(true);
      return { error: null };
    } catch (err: any) {
      return { error: new Error(err.message) };
    }
  };

  return { hasConsented, loading, giveConsent };
}
