import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { RISK_CONSENT_TEXT } from '@/types/trading';

export function useRiskConsent() {
  const { user } = useAuth();
  const [hasConsented, setHasConsented] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkConsent = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    
    const { data } = await supabase
      .from('risk_consent')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    setHasConsented(!!data);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    checkConsent();
  }, [checkConsent]);

  const giveConsent = async () => {
    if (!user) return { error: new Error('Not authenticated') };
    
    const { error } = await supabase
      .from('risk_consent')
      .upsert({
        user_id: user.id,
        consent_text: RISK_CONSENT_TEXT,
        consented_at: new Date().toISOString(),
      } as any, { onConflict: 'user_id' });

    if (!error) setHasConsented(true);
    return { error };
  };

  return { hasConsented, loading, giveConsent };
}
