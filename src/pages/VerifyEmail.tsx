import { useEffect, useState } from "react";
import { applyActionCode, reload } from "firebase/auth";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { auth } from "@/integrations/firebase/client";

type VerificationResult = "loading" | "success" | "error";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const { refreshUser } = useAuth();
  const [result, setResult] = useState<VerificationResult>("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    const mode = searchParams.get("mode");
    const actionCode = searchParams.get("oobCode");
    const isFirebaseRedirect = searchParams.get("source") === "firebase";

    const verify = async () => {
      try {
        if (mode === "verifyEmail" && actionCode) {
          await applyActionCode(auth, actionCode);
        } else if (!isFirebaseRedirect) {
          throw new Error("This verification link is invalid or expired.");
        }

        if (auth.currentUser) {
          await reload(auth.currentUser);
          if (!auth.currentUser.emailVerified) {
            throw new Error("Firebase did not confirm the email address. Open the verification link in your email to try again.");
          }
        }
        await refreshUser();
        if (active) setResult("success");
      } catch (error) {
        if (!active) return;
        setMessage(error instanceof Error ? error.message : "Could not verify your email address.");
        setResult("error");
      }
    };

    void verify();
    return () => { active = false; };
  }, [searchParams, refreshUser]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          {result === "loading" && <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />}
          {result === "success" && <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />}
          {result === "error" && <XCircle className="mx-auto h-10 w-10 text-destructive" />}
          <CardTitle>
            {result === "loading" ? "Verifying your email..." : result === "success" ? "Email verified" : "Verification failed"}
          </CardTitle>
          <CardDescription>
            {result === "loading"
              ? "Please wait while Firebase confirms your email address."
              : result === "success"
                ? "Your email address has been verified."
                : message}
          </CardDescription>
        </CardHeader>
        {result !== "loading" && (
          <CardContent>
            <Button asChild className="w-full">
              <Link to={result === "success" ? "/dashboard" : "/login"}>
                {result === "success" ? "Continue to app" : "Back to sign in"}
              </Link>
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
