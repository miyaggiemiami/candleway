import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { api } from "@/lib/api";
import { SubscriptionTier } from "@/types/trading";

interface AuthUser {
  id: string;
  email?: string;
}

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
  user: AuthUser | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: Error | null; needsConfirmation?: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  incrementDailyUsage: () => Promise<void>;
  checkSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapUser(user: User): AuthUser {
  return { id: user.id, email: user.email };
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    if (!user) return;
    try {
      const data = await api.profiles.get();
      setProfile({
        ...data,
        subscription_tier: data.subscription_tier || "free",
      } as UserProfile);
    } catch (err) {
      console.error("Error fetching profile:", err);
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile();
  };

  const incrementDailyUsage = async () => {
    if (!user || !profile) return;
    const newCount = (profile.daily_analyses_used || 0) + 1;
    await api.profiles.update({ daily_analyses_used: newCount });
    setProfile({ ...profile, daily_analyses_used: newCount });
  };

  const checkSubscription = async () => {
    if (!session) return;
    try {
      await api.stripe.checkSubscription();
      await fetchProfile();
    } catch (err) {
      console.error("Error checking subscription:", err);
    }
  };

  useEffect(() => {
    let mounted = true;

    const applySession = async (nextSession: Session | null) => {
      if (!mounted) return;
      setSession(nextSession);
      setUser(nextSession?.user ? mapUser(nextSession.user) : null);
      if (nextSession?.user) {
        try {
          let data = await api.profiles.get();
          const displayName = nextSession.user.user_metadata?.display_name;
          if (displayName && !data.display_name) {
            data = await api.profiles.update({ display_name: displayName });
          }
          if (!mounted) return;
          setProfile({
            ...data,
            subscription_tier: data.subscription_tier || "free",
          } as UserProfile);
        } catch (err) {
          console.error("Error fetching profile:", err);
        }
      } else {
        setProfile(null);
      }
      if (mounted) setLoading(false);
    };

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      void applySession(initialSession);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      // Supabase recommends deferring follow-up client calls from this
      // callback so the auth lock can be released before the profile request.
      setTimeout(() => void applySession(nextSession), 0);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, displayName?: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: { display_name: displayName || "" },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });
      if (error) throw error;
      return { error: null, needsConfirmation: !data.session };
    } catch (err: any) {
      return { error: new Error(err.message || "Sign up failed") };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) throw error;
      return { error: null };
    } catch (err: any) {
      return { error: new Error(err.message || "Sign in failed") };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
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
