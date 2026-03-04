import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, Shield } from "lucide-react";
import { useState } from "react";
import { RISK_CONSENT_TEXT } from "@/types/trading";

interface RiskConsentDialogProps {
  open: boolean;
  onConsent: () => void;
  onCancel: () => void;
}

export function RiskConsentDialog({ open, onConsent, onCancel }: RiskConsentDialogProps) {
  const [accepted, setAccepted] = useState(false);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Shield className="h-6 w-6 text-warning" />
            Risk Agreement Required
          </DialogTitle>
          <DialogDescription>
            You must acknowledge the risks before using trading automation features.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-start gap-3 p-4 rounded-lg bg-warning/10 border border-warning/30">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <p className="text-sm text-foreground leading-relaxed">
              {RISK_CONSENT_TEXT}
            </p>
          </div>

          <div className="flex items-start gap-3">
            <Checkbox
              id="consent"
              checked={accepted}
              onCheckedChange={(checked) => setAccepted(checked === true)}
            />
            <label htmlFor="consent" className="text-sm text-muted-foreground cursor-pointer leading-relaxed">
              I have read and agree to the risk disclaimer. I understand that AI signals are not financial advice and I trade at my own risk.
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={onConsent} disabled={!accepted}>
            <Shield className="h-4 w-4 mr-2" />
            Accept & Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
