import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { auth } from "@/integrations/firebase/client";
import { sendPasswordResetEmail } from "firebase/auth";
import { TrendingUp, Mail, Lock, Loader2, User, Eye, EyeOff } from "lucide-react";
import { z } from "zod";

const emailSchema = z.string().email("Please enter a valid email address");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(location.pathname === "/signup" ? "signup" : "login");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { toast } = useToast();
  const { user, signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleForgotPassword = async () => {
    if (!email) {
      toast({ title: "Email Required", description: "Enter your email address first, then click forgot password.", variant: "destructive" });
      return;
    }
    try {
      emailSchema.parse(email);
    } catch {
      toast({ title: "Invalid Email", description: "Please enter a valid email address.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim().toLowerCase(), {
        url: `${window.location.origin}/reset-password?source=firebase`,
      });
      toast({
        title: "Check your email",
        description: "If an account exists for this address, Firebase will send a password reset link.",
      });
    } catch (err: unknown) {
      const errorCode = typeof err === "object" && err !== null && "code" in err ? err.code : "";
      if (errorCode === "auth/user-not-found") {
        toast({
          title: "Check your email",
          description: "If an account exists for this address, Firebase will send a password reset link.",
        });
        return;
      }
      console.error("Firebase password reset request failed:", err);
      toast({
        title: "Password reset request failed",
        description: err instanceof Error ? err.message : "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      const requestedPath = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
      const destination = requestedPath?.startsWith("/") ? requestedPath : "/dashboard";
      navigate(destination, { replace: true });
    }
  }, [user, navigate, location.state]);

  useEffect(() => {
    setActiveTab(location.pathname === "/signup" ? "signup" : "login");
  }, [location.pathname]);

  const validateInputs = (isSignUp: boolean) => {
    try { emailSchema.parse(email); } catch {
      toast({ title: "Invalid Email", description: "Please enter a valid email address", variant: "destructive" });
      return false;
    }
    try { passwordSchema.parse(password); } catch {
      toast({ title: "Invalid Password", description: "Password must be at least 6 characters", variant: "destructive" });
      return false;
    }
    if (isSignUp && password !== confirmPassword) {
      toast({ title: "Passwords Don't Match", description: "Please make sure your passwords match", variant: "destructive" });
      return false;
    }
    if (isSignUp && displayName.trim().length < 2) {
      toast({ title: "Name Required", description: "Please enter your name (at least 2 characters)", variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateInputs(false)) return;
    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);
    if (error) {
      let message = error.message;
      if (error.message.includes("invalid-credential") || error.message.includes("wrong-password")) message = "Invalid email or password. Please try again.";
      toast({ title: "Login Failed", description: message, variant: "destructive" });
    } else {
      toast({ title: "Welcome back!", description: "You have successfully logged in." });
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateInputs(true)) return;
    setIsLoading(true);
    const { error } = await signUp(email, password, displayName.trim());
    setIsLoading(false);
    if (error) {
      let message = error.message;
      if (error.message.includes("email-already-in-use")) message = "An account with this email already exists. Please log in instead.";
      if (error.message.includes("operation-not-allowed")) message = "Email/password sign-in is not enabled in Firebase Authentication.";
      toast({ title: "Sign Up Failed", description: message, variant: "destructive" });
    } else {
      toast({
        title: "Account Created!",
        description: "Welcome to Apexium. You can verify your email later from the reminder in the app.",
      });
    }
  };

  const PasswordToggle = ({ show, onToggle }: { show: boolean; onToggle: () => void }) => (
    <button
      type="button"
      onClick={onToggle}
      className="absolute right-3 top-3 h-4 w-4 text-muted-foreground hover:text-foreground transition-colors"
      tabIndex={-1}
    >
      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="p-2 bg-primary/10 rounded-xl">
            <TrendingUp className="h-8 w-8 text-primary" />
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Apexium
          </span>
        </div>

        <Card className="border-border/50 shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Welcome</CardTitle>
            <CardDescription>Sign in to your account or create a new one</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input id="login-email" type="email" placeholder="trader@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input id="login-password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 pr-10" required />
                      <PasswordToggle show={showPassword} onToggle={() => setShowPassword(v => !v)} />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in...</> : "Sign In"}
                  </Button>
                  <div className="text-center">
                    <button type="button" onClick={handleForgotPassword} disabled={isLoading} className="text-sm text-primary hover:underline disabled:opacity-50">
                      Forgot your password?
                    </button>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="display-name">Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input id="display-name" type="text" placeholder="Your name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="pl-10" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input id="signup-email" type="email" placeholder="trader@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input id="signup-password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 pr-10" required />
                      <PasswordToggle show={showPassword} onToggle={() => setShowPassword(v => !v)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input id="confirm-password" type={showConfirmPassword ? "text" : "password"} placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="pl-10 pr-10" required />
                      <PasswordToggle show={showConfirmPassword} onToggle={() => setShowConfirmPassword(v => !v)} />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating account...</> : "Create Account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              <p>By continuing, you agree to our Terms of Service and Privacy Policy</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
