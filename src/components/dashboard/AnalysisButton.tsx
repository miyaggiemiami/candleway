import { Sparkles, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AnalysisButtonProps {
  onClick: () => void;
  disabled: boolean;
  isLoading: boolean;
  hasImage: boolean;
  isLimitReached: boolean;
}

export function AnalysisButton({
  onClick,
  disabled,
  isLoading,
  hasImage,
  isLimitReached,
}: AnalysisButtonProps) {
  const getButtonContent = () => {
    if (isLoading) {
      return (
        <>
          <Loader2 className="h-5 w-5 animate-spin" />
          Analyzing Chart...
        </>
      );
    }

    if (isLimitReached) {
      return (
        <>
          <Lock className="h-5 w-5" />
          Daily Limit Reached
        </>
      );
    }

    if (!hasImage) {
      return (
        <>
          <Sparkles className="h-5 w-5" />
          Upload Chart to Analyze
        </>
      );
    }

    return (
      <>
        <Sparkles className="h-5 w-5" />
        Analyze Chart with AI
      </>
    );
  };

  return (
    <Button
      onClick={onClick}
      disabled={disabled || isLoading}
      size="xl"
      variant={isLimitReached ? "secondary" : "premium"}
      className={cn(
        "w-full relative overflow-hidden",
        !disabled && !isLoading && "pulse-glow"
      )}
    >
      {/* Animated background gradient */}
      {!disabled && !isLoading && (
        <div className="absolute inset-0 bg-gradient-to-r from-primary via-emerald-400 to-primary bg-[length:200%_100%] animate-shimmer opacity-50" />
      )}
      <span className="relative flex items-center gap-2">
        {getButtonContent()}
      </span>
    </Button>
  );
}
