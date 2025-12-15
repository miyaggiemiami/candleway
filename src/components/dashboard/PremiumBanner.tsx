import { Crown, Zap, TrendingUp, Shield, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function PremiumBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/20 via-emerald-500/10 to-primary/20 border border-primary/30 p-6">
      {/* Background decoration */}
      <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute -left-12 -bottom-12 h-32 w-32 rounded-full bg-emerald-400/10 blur-3xl" />

      <button
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-3 p-1 rounded-full hover:bg-background/20 transition-colors"
      >
        <X className="h-4 w-4 text-muted-foreground" />
      </button>

      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/20">
              <Crown className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Upgrade to Premium</h3>
              <p className="text-sm text-muted-foreground">Unlock unlimited potential</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div className="flex items-center gap-2 text-sm">
              <Zap className="h-4 w-4 text-primary" />
              <span>Unlimited Analyses</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span>Advanced AI</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Shield className="h-4 w-4 text-primary" />
              <span>No Ads</span>
            </div>
          </div>
        </div>

        <Button variant="premium" size="lg" className="shrink-0" onClick={() => window.location.href = "/pricing"}>
          <Crown className="h-5 w-5" />
          Go Premium
        </Button>
      </div>
    </div>
  );
}
