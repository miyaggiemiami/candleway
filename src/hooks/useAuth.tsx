import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api, getToken, setToken, removeToken } from "@/lib/api";
import { SubscriptionTier } from "@/types/trading";

interface AuthUser {
  id: string;
  email: string;
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
  session: { access_token: string } | null;
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
  const [loading, setLoading] = useState(true);

  const token = getToken();
  const session = token ? { access_token: token } : null;

  const fetchProfile = async () => {
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
    if (!token) return;
    try {
      await api.stripe.checkSubscription();
      await fetchProfile();
    } catch (err) {
      console.error("Error checking subscription:", err);
    }
  };

  useEffect(() => {
    const init = async () => {
      const savedToken = getToken();
      if (!savedToken) {
        setLoading(false);
        return;
      }
      try {
        const userData = await api.auth.me();
        setUser({ id: userData.id, email: userData.email });
        await fetchProfile();
      } catch {
        removeToken();
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const signUp = async (email: string, password: string, displayName?: string) => {
    try {
      const data = await api.auth.signup(email, password, displayName);
      setToken(data.token);
      setUser({ id: data.user.id, email: data.user.email });
      await fetchProfile();
      return { error: null };
    } catch (err: any) {
      return { error: new Error(err.message || "Sign up failed") };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const data = await api.auth.signin(email, password);
      setToken(data.token);
      setUser({ id: data.user.id, email: data.user.email });
      await fetchProfile();
      return { error: null };
    } catch (err: any) {
      return { error: new Error(err.message || "Sign in failed") };
    }
  };

  const signOut = async () => {
    removeToken();
    setUser(null);
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
