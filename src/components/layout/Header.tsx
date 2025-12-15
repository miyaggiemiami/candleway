import { TrendingUp, Crown, Menu, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface HeaderProps {
  isPremium?: boolean;
  dailyUsed?: number;
  dailyLimit?: number;
}

export function Header({ isPremium = false, dailyUsed = 0, dailyLimit = 3 }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <a href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-emerald-400 shadow-lg shadow-primary/30">
            <TrendingUp className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight">
              <span className="gradient-text">CandleWay</span>
            </span>
            <span className="text-[10px] text-muted-foreground -mt-1">AI Chart Analyzer</span>
          </div>
        </a>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <a href="/" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
            Dashboard
          </a>
          <a href="/history" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
            History
          </a>
          <a href="/pricing" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
            Pricing
          </a>
          <a href="/settings" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
            Settings
          </a>
        </nav>

        {/* Right Side */}
        <div className="flex items-center gap-3">
          {/* Usage Counter */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 border border-border/50">
            <span className="text-xs text-muted-foreground">Daily:</span>
            <span className={cn(
              "text-sm font-mono font-semibold",
              dailyUsed >= dailyLimit ? "text-destructive" : "text-primary"
            )}>
              {dailyUsed}/{dailyLimit}
            </span>
          </div>

          {isPremium ? (
            <Badge variant="premium" className="gap-1">
              <Crown className="h-3 w-3" />
              Premium
            </Badge>
          ) : (
            <Button variant="premium" size="sm" className="hidden sm:flex" onClick={() => window.location.href = "/pricing"}>
              <Crown className="h-4 w-4" />
              Upgrade
            </Button>
          )}

          <Button variant="ghost" size="icon" className="hidden md:flex">
            <User className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border/40 bg-background/95 backdrop-blur-xl animate-fade-in">
          <nav className="container flex flex-col gap-2 p-4">
            <a href="/" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-secondary transition-colors">
              <span className="text-sm font-medium">Dashboard</span>
            </a>
            <a href="/history" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-secondary transition-colors">
              <span className="text-sm font-medium">History</span>
            </a>
            <a href="/pricing" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-secondary transition-colors">
              <span className="text-sm font-medium">Pricing</span>
            </a>
            <a href="/settings" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-secondary transition-colors">
              <span className="text-sm font-medium">Settings</span>
            </a>
            <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-secondary/50">
              <span className="text-sm text-muted-foreground">Daily Analyses</span>
              <span className="text-sm font-mono font-semibold text-primary">{dailyUsed}/{dailyLimit}</span>
            </div>
            {!isPremium && (
              <Button variant="premium" className="mt-2" onClick={() => window.location.href = "/pricing"}>
                <Crown className="h-4 w-4" />
                Upgrade to Premium
              </Button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
