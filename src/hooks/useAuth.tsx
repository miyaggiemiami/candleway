import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  reload,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  User,
} from "firebase/auth";
import { api } from "@/lib/api";
import { auth } from "@/integrations/firebase/client";
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
  userRefreshVersion: number;
  profile: UserProfile | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  incrementDailyUsage: () => Promise<void>;
  checkSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function toError(error: unknown, fallback: string) {
  return error instanceof Error ? error : new Error(fallback);
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userRefreshVersion, setUserRefreshVersion] = useState(0);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setProfile(null);
      return;
    }
    try {
      const data = await api.profiles.get();
      if (auth.currentUser?.uid === currentUser.uid) {
        setProfile({
          ...data,
          subscription_tier: data.subscription_tier || "free",
        } as UserProfile);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      if (!mounted) return;
      setUser(nextUser);
      if (!nextUser) {
        setProfile(null);
        setLoading(false);
        return;
      }
      try {
        const data = await api.profiles.get();
        if (mounted && auth.currentUser?.uid === nextUser.uid) {
          setProfile({
            ...data,
            subscription_tier: data.subscription_tier || "free",
          } as UserProfile);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    }, (error) => {
      console.error("Error restoring Firebase session:", error);
      if (mounted) {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const refreshUser = useCallback(async () => {
    if (!auth.currentUser) return;
    await reload(auth.currentUser);
    setUser(auth.currentUser);
    setUserRefreshVersion((version) => version + 1);
  }, []);

  const refreshProfile = useCallback(async () => {
    await fetchProfile();
  }, [fetchProfile]);

  const incrementDailyUsage = async () => {
    if (!user || !profile) return;
    const newCount = (profile.daily_analyses_used || 0) + 1;
    await api.profiles.update({ daily_analyses_used: newCount });
    setProfile({ ...profile, daily_analyses_used: newCount });
  };

  const checkSubscription = async () => {
    if (!auth.currentUser) return;
    try {
      await api.stripe.checkSubscription();
      await fetchProfile();
    } catch (error) {
      console.error("Error checking subscription:", error);
    }
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    try {
      const credential = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      await updateProfile(credential.user, { displayName: displayName.trim() });
      setUser(credential.user);
      return { error: null };
    } catch (error) {
      return { error: toError(error, "Could not create your account") };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      setUser(credential.user);
      return { error: null };
    } catch (error) {
      return { error: toError(error, "Could not sign in") };
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userRefreshVersion,
        profile,
        loading,
        signUp,
        signIn,
        signOut,
        refreshUser,
        refreshProfile,
        incrementDailyUsage,
        checkSubscription,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
