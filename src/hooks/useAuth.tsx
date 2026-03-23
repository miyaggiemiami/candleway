import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { SubscriptionTier } from "@/types/trading";

interface UserProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  username: string | null;
  is_premium: boolean;
  daily_analyses_used: number;
  last_analysis_reset: string | null;
  subscription_tier: SubscriptionTier;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  incrementDailyUsage: () => Promise<void>;
  checkSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (!error && data) {
      const lastReset = data.last_analysis_reset ? new Date(data.last_analysis_reset) : null;
      const now = new Date();
      const hoursSinceReset = lastReset ? (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60) : 25;
      
      if (hoursSinceReset >= 24) {
        await supabase
          .from('profiles')
          .update({ daily_analyses_used: 0, last_analysis_reset: now.toISOString() })
          .eq('user_id', userId);
        
        setProfile({ 
          ...data, 
          daily_analyses_used: 0, 
          last_analysis_reset: now.toISOString(),
          subscription_tier: (data as any).subscription_tier || 'free',
        } as UserProfile);
      } else {
        setProfile({
          ...data,
          subscription_tier: (data as any).subscription_tier || 'free',
        } as UserProfile);
      }
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  const incrementDailyUsage = async () => {
    if (!user || !profile) return;
    const newCount = (profile.daily_analyses_used || 0) + 1;
    await supabase
      .from('profiles')
      .update({ daily_analyses_used: newCount })
      .eq('user_id', user.id);
    setProfile({ ...profile, daily_analyses_used: newCount });
  };

  const checkSubscription = async () => {
    if (!session) return;
    try {
      const response = await fetch('/api/check-subscription', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (response.ok) {
        await refreshProfile();
      }
    } catch (err) {
      console.error('Error checking subscription:', err);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        if (session?.user) {
          setTimeout(() => fetchProfile(session.user.id), 0);
        } else {
          setProfile(null);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) fetchProfile(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, displayName?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/` }
    });
    if (!error && data.user && displayName) {
      await supabase
        .from('profiles')
        .update({ display_name: displayName })
        .eq('user_id', data.user.id);
    }
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signUp, signIn, signOut, refreshProfile, incrementDailyUsage, checkSubscription }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
