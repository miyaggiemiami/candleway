import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";
import { SubscriptionTier } from "@/types/trading";

type AuthUser = User;

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
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  incrementDailyUsage: () => Promise<void>;
  checkSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
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
      setUser(nextSession?.user ?? null);
      if (nextSession?.user) {
        try {
          const data = await api.profiles.get();
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

    supabase.auth.getSession().then(({ data }) => applySession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      // Defer the profile request until Supabase finishes its auth callback.
      // Calling getSession synchronously inside this listener can deadlock.
      setTimeout(() => void applySession(nextSession), 0);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, displayName?: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: { display_name: displayName?.trim() || null },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });
      if (error) throw error;
      return { error: null };
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
    const { error } = await supabase.auth.signOut();
    if (error) console.error("Sign out error:", error);
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
