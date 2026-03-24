import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { TrendingUp, Lock, Loader2, CheckCircle } from "lucide-react";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast({ title: "Invalid Password", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Passwords Don't Match", description: "Please make sure your passwords match.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      await api.auth.resetPassword(token!, password);
      setIsSuccess(true);
      toast({ title: "Password Updated", description: "Your password has been successfully reset." });
      setTimeout(() => navigate("/auth"), 2000);
    } catch (err: any) {
      toast({ title: "Reset Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-border/50 shadow-xl">
          <CardContent className="pt-6 text-center space-y-4">
            <p className="text-muted-foreground">Invalid or expired reset link. Please request a new one.</p>
            <Button onClick={() => navigate("/auth")}>Back to Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
            <CardTitle className="text-2xl">
              {isSuccess ? "Password Reset!" : "Set New Password"}
            </CardTitle>
            <CardDescription>
              {isSuccess ? "You'll be redirected shortly." : "Enter your new password below."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isSuccess ? (
              <div className="flex flex-col items-center gap-4 py-4">
                <CheckCircle className="h-12 w-12 text-primary" />
                <p className="text-sm text-muted-foreground">Redirecting to login...</p>
              </div>
            ) : (
              <form onSubmit={handleReset} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="new-password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-new-password">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="confirm-new-password" type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="pl-10" required />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Updating...</> : "Update Password"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
