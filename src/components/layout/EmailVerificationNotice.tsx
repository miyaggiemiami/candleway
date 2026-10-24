import { useEffect, useState } from "react";
import { sendEmailVerification } from "firebase/auth";
import { MailCheck, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

export function EmailVerificationNotice() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    setDismissed(false);
    setEmailSent(false);
  }, [user?.uid]);

  if (!user || user.emailVerified || dismissed) return null;

  const handleSend = async () => {
    setIsSending(true);
    try {
      await sendEmailVerification(user, {
        url: `${window.location.origin}/verify-email?source=firebase`,
        handleCodeInApp: false,
      });
      setEmailSent(true);
      toast({
        title: "Verification email sent",
        description: `Check ${user.email} for your verification link.`,
      });
    } catch (error) {
      console.error("Firebase verification email error:", error);
      toast({
        title: "Could not send verification email",
        description: error instanceof Error ? error.message : "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 border-b border-border bg-muted/70 px-4 py-3 text-sm">
      <MailCheck className="h-4 w-4 shrink-0 text-primary" />
      <p className="text-center text-muted-foreground">
        Your email is not verified. You can keep using your account and verify it later.
      </p>
      <Button type="button" size="sm" variant="outline" onClick={handleSend} disabled={isSending || emailSent}>
        {isSending ? "Sending..." : emailSent ? "Email sent" : "Send verification email"}
      </Button>
      <button
        type="button"
        className="rounded p-1 text-muted-foreground hover:text-foreground"
        aria-label="Dismiss email verification reminder"
        onClick={() => setDismissed(true)}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
