import { FormEvent, useEffect, useState } from "react";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2, Lock, TrendingUp } from "lucide-react";
import { auth } from "@/integrations/firebase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

type PageState = "checking" | "ready" | "success" | "error";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const [state, setState] = useState<PageState>("checking");
  const [actionCode, setActionCode] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let active = true;
    const code = searchParams.get("oobCode");
    const mode = searchParams.get("mode");

    if (mode === "resetPassword" && code) {
      verifyPasswordResetCode(auth, code)
        .then(() => {
          if (!active) return;
          setActionCode(code);
          setState("ready");
        })
        .catch((error: unknown) => {
          if (!active) return;
          setMessage(error instanceof Error ? error.message : "This password reset link is invalid or expired.");
          setState("error");
        });
    } else if (searchParams.get("source") === "firebase") {
      setState("success");
    } else {
      setMessage("This password reset link is invalid or expired. Request a new one from the sign-in page.");
      setState("error");
    }

    return () => { active = false; };
  }, [searchParams]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (password.length < 6) {
      toast({ title: "Invalid password", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", description: "Please enter the same password twice.", variant: "destructive" });
      return;
    }
    if (!actionCode) return;

    setIsSubmitting(true);
    try {
      await confirmPasswordReset(auth, actionCode, password);
      setState("success");
      toast({ title: "Password updated", description: "Your password has been reset." });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Could not update your password.";
      setMessage(errorMessage);
      setState("error");
      toast({ title: "Reset failed", description: errorMessage, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className="rounded-xl bg-primary/10 p-2"><TrendingUp className="h-8 w-8 text-primary" /></div>
          <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-2xl font-bold text-transparent">Apexium</span>
        </div>
        <Card className="border-border/50 shadow-xl">
          <CardHeader className="text-center">
            {state === "checking" && <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />}
            {state === "success" && <CheckCircle2 className="mx-auto h-8 w-8 text-primary" />}
            <CardTitle>
              {state === "checking" ? "Checking reset link..." : state === "ready" ? "Set a new password" : state === "success" ? "Password reset" : "Reset link unavailable"}
            </CardTitle>
            <CardDescription>
              {state === "success" ? "Your password was reset. Sign in with your new password." : state === "error" ? message : "Choose a new password for your account."}
            </CardDescription>
          </CardHeader>
          {state === "ready" && (
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="new-password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="pl-10" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm new password</Label>
                  <Input id="confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Updating...</> : "Update password"}
                </Button>
              </form>
            </CardContent>
          )}
          {(state === "success" || state === "error") && (
            <CardContent>
              <Button asChild className="w-full"><Link to="/login">Back to sign in</Link></Button>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
