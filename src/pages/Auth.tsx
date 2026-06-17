import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { TrendingUp, Mail, Lock, Loader2, User, Eye, EyeOff, Copy, ExternalLink } from "lucide-react";
import { z } from "zod";

const emailSchema = z.string().email("Please enter a valid email address");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("login");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [resetLink, setResetLink] = useState<string | null>(null);

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
      const data = await api.auth.forgotPassword(email) as any;
      if (data?.resetUrl) {
        setResetLink(data.resetUrl);
      } else {
        toast({ title: "Reset Link Sent", description: "Check your email for a password reset link." });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) navigate("/");
  }, [user, navigate]);

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
      if (error.message.includes("Invalid login credentials")) message = "Invalid email or password. Please try again.";
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
      if (error.message.includes("already exists")) message = "An account with this email already exists. Please log in instead.";
      toast({ title: "Sign Up Failed", description: message, variant: "destructive" });
    } else {
      toast({ title: "Account Created!", description: "Welcome to Apexium. Start analyzing charts now!" });
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

        {resetLink && (
          <Card className="border-primary/40 bg-primary/5 shadow-xl mb-4">
            <CardContent className="pt-4 pb-4 space-y-3">
              <p className="text-sm font-semibold text-primary">Your password reset link is ready:</p>
              <p className="text-xs text-muted-foreground">Copy the link below and open it in your browser, or click "Open" to go directly.</p>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={resetLink}
                  className="text-xs font-mono bg-secondary/50"
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => { navigator.clipboard.writeText(resetLink); toast({ title: "Copied!", description: "Reset link copied to clipboard." }); }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => window.open(resetLink, "_blank")}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">This link expires in 1 hour.</p>
            </CardContent>
          </Card>
        )}

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
