import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Play, Crown, X } from "lucide-react";

interface AdDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdComplete: () => void;
  onUpgrade: () => void;
}

export function AdDialog({ open, onOpenChange, onAdComplete, onUpgrade }: AdDialogProps) {
  const [adState, setAdState] = useState<"ready" | "playing" | "complete">("ready");
  const [progress, setProgress] = useState(0);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (adState === "playing") {
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setAdState("complete");
            return 100;
          }
          return prev + 2;
        });
      }, 100);

      const countdownInterval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        clearInterval(interval);
        clearInterval(countdownInterval);
      };
    }
  }, [adState]);

  useEffect(() => {
    if (!open) {
      setAdState("ready");
      setProgress(0);
      setCountdown(5);
    }
  }, [open]);

  const handleStartAd = () => {
    setAdState("playing");
  };

  const handleAdComplete = () => {
    onAdComplete();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={adState === "playing" ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => adState === "playing" && e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {adState === "ready" && "Watch Ad to Continue"}
            {adState === "playing" && "Advertisement"}
            {adState === "complete" && "Ad Complete!"}
          </DialogTitle>
          <DialogDescription>
            {adState === "ready" && "Watch a short ad to unlock your free analysis"}
            {adState === "playing" && `Please wait ${countdown} seconds...`}
            {adState === "complete" && "You can now proceed with your analysis"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {adState === "ready" && (
            <>
              <div className="aspect-video bg-secondary/50 rounded-lg flex items-center justify-center border border-border/50">
                <div className="text-center space-y-3">
                  <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                    <Play className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground">5 second advertisement</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button onClick={handleStartAd} className="flex-1 gap-2">
                  <Play className="h-4 w-4" />
                  Watch Ad
                </Button>
                <Button variant="outline" onClick={onUpgrade} className="gap-2">
                  <Crown className="h-4 w-4" />
                  Go Premium
                </Button>
              </div>
            </>
          )}

          {adState === "playing" && (
            <>
              <div className="aspect-video bg-gradient-to-br from-primary/20 via-secondary to-primary/10 rounded-lg flex items-center justify-center border border-primary/20 relative overflow-hidden">
                <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-20" />
                <div className="text-center space-y-2 relative z-10">
                  <div className="text-4xl font-bold gradient-text">CandleWay</div>
                  <p className="text-sm text-muted-foreground">AI-Powered Trading Analysis</p>
                  <p className="text-xs text-primary">Upgrade to Premium for ad-free experience</p>
                </div>
              </div>
              <div className="space-y-2">
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-center text-muted-foreground">
                  {countdown > 0 ? `${countdown}s remaining` : "Almost done..."}
                </p>
              </div>
            </>
          )}

          {adState === "complete" && (
            <>
              <div className="aspect-video bg-emerald-500/10 rounded-lg flex items-center justify-center border border-emerald-500/20">
                <div className="text-center space-y-2">
                  <div className="h-16 w-16 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <svg className="h-8 w-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-sm text-emerald-400 font-medium">Thank you for watching!</p>
                </div>
              </div>
              <Button onClick={handleAdComplete} className="w-full">
                Continue to Analysis
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
